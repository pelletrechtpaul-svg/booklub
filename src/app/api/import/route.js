import { NextResponse } from "next/server";

// Server-side book import from a product URL (e.g. Amazon). Runs on the
// server so it isn't blocked by CORS, and never exposes the target site's
// anti-bot behaviour to the browser.
//
// Strategy:
//  1. Pull an ISBN/ASIN out of the URL and ask Open Library for structured
//     data (title, author, year, cover) — reliable, no scraping.
//  2. Fetch the page itself for OpenGraph tags (og:title, og:image) as a
//     supplement / fallback (Amazon exposes the cover as og:image).
//  3. Merge, preferring the structured Open Library data.

export const dynamic = "force-dynamic";

function decodeEntities(s) {
  if (!s) return "";
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function metaContent(html, prop) {
  // Match <meta property="og:x" content="..."> in either attribute order.
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`,
      "i"
    ),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeEntities(m[1]);
  }
  return "";
}

function extractIsbn(url) {
  // Amazon: /dp/ASIN, /gp/product/ASIN, /product/ASIN. For print books the
  // ASIN is the ISBN-10. Kindle ASINs start with B0 and aren't ISBNs.
  const m = url.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i);
  if (m) {
    const asin = m[1].toUpperCase();
    if (/^\d{9}[\dX]$/.test(asin)) return asin; // looks like an ISBN-10
  }
  // Also accept a bare ISBN-13 anywhere in the URL.
  const m13 = url.match(/(97[89]\d{10})/);
  if (m13) return m13[1];
  return "";
}

async function fromOpenLibrary(isbn) {
  try {
    const res = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
      { headers: { "User-Agent": "booklub/1.0" } }
    );
    if (!res.ok) return {};
    const data = await res.json();
    const book = data[`ISBN:${isbn}`];
    if (!book) return {};
    return {
      title: book.title || "",
      author: (book.authors || []).map((a) => a.name).join(", "),
      year: (book.publish_date || "").match(/\d{4}/)?.[0] || "",
      cover: book.cover?.large || book.cover?.medium || "",
    };
  } catch {
    return {};
  }
}

async function fromPage(url) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
        Accept: "text/html",
      },
    });
    if (!res.ok) return {};
    const html = await res.text();
    let title = metaContent(html, "og:title");
    // Amazon often prefixes/suffixes noise; strip an "Amazon.fr - " prefix.
    title = title.replace(/^Amazon\.[a-z.]+\s*[-:]\s*/i, "");
    return {
      title,
      cover: metaContent(html, "og:image"),
    };
  } catch {
    return {};
  }
}

export async function GET(request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "URL manquante." }, { status: 400 });
  }

  let target;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: "URL invalide." }, { status: 400 });
  }
  if (!/^https?:$/.test(target.protocol)) {
    return NextResponse.json({ error: "URL invalide." }, { status: 400 });
  }

  const isbn = extractIsbn(target.toString());

  // Run both lookups in parallel; merge with Open Library taking priority
  // for text fields, and the page's og:image as a cover fallback.
  const [ol, page] = await Promise.all([
    isbn ? fromOpenLibrary(isbn) : Promise.resolve({}),
    fromPage(target.toString()),
  ]);

  const result = {
    title: ol.title || page.title || "",
    author: ol.author || "",
    year: ol.year || "",
    cover: ol.cover || page.cover || "",
  };

  if (!result.title && !result.cover) {
    return NextResponse.json(
      {
        error:
          "Rien trouvé depuis ce lien. Colle un lien produit (livre) ou saisis les infos à la main.",
      },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
