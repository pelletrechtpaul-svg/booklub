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

// BNF (Bibliothèque nationale de France) SRU API. Authoritative for French
// books: publishers deposit metadata via the dépôt légal even before release,
// so brand-new titles are found here when other catalogues don't know them
// yet. Free, no key. Returns UNIMARC XML that we parse leniently.
async function fromBnf(isbn) {
  try {
    const res = await fetch(
      "https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve" +
        "&recordSchema=unimarcxchange&maximumRecords=1" +
        `&query=bib.isbn%20any%20%22${isbn}%22`,
      { headers: { "User-Agent": "booklub/1.0" } }
    );
    if (!res.ok) return {};
    const xml = await res.text();

    // Grab a whole datafield block by tag, then a subfield's text by code.
    const field = (tag) =>
      xml.match(
        new RegExp(
          `<[\\w:]*datafield[^>]*tag=["']${tag}["'][^>]*>([\\s\\S]*?)</[\\w:]*datafield>`
        )
      )?.[1] || "";
    const sub = (block, code) =>
      block.match(
        new RegExp(
          `<[\\w:]*subfield[^>]*code=["']${code}["'][^>]*>([\\s\\S]*?)</[\\w:]*subfield>`
        )
      )?.[1] || "";

    const f200 = field("200"); // title statement
    const title = decodeEntities(sub(f200, "a"));
    const subtitle = decodeEntities(sub(f200, "e"));

    const f700 = field("700"); // first author
    const author = [decodeEntities(sub(f700, "b")), decodeEntities(sub(f700, "a"))]
      .filter(Boolean)
      .join(" ");

    const year =
      (decodeEntities(sub(field("214"), "d")) || decodeEntities(sub(field("210"), "d")))
        .match(/\d{4}/)?.[0] || "";

    return {
      title: subtitle ? `${title}. ${subtitle}` : title,
      author,
      year,
    };
  } catch {
    return {};
  }
}

// Google Books by exact ISBN, server-side. Occasional server-side lookups
// rarely hit the anonymous rate limit that plagues browser calls, and it's
// only one of several sources here anyway. Good for covers of new releases.
async function fromGoogleBooks(isbn) {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&country=FR`
    );
    if (!res.ok) return {};
    const data = await res.json();
    const info = data.items?.[0]?.volumeInfo;
    if (!info) return {};
    const links = info.imageLinks || {};
    const cover = (links.thumbnail || links.smallThumbnail || "")
      .replace("http://", "https://")
      .replace("&edge=curl", "");
    return {
      title: info.title || "",
      author: (info.authors || []).join(", "),
      year: (info.publishedDate || "").slice(0, 4),
      cover,
    };
  } catch {
    return {};
  }
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
    // Bookshop pages decorate og:title with site noise. Strip a leading
    // "Amazon.fr - " style prefix and trailing " - Site name" style
    // suffixes (site names never contain digits; a book subtitle often
    // does, so only strip all-letter trailing segments).
    title = title.replace(/^Amazon\.[a-z.]+\s*[-:]\s*/i, "");
    title = title
      .split(" - ")
      .filter(
        (part, i, arr) =>
          i === 0 || !(i >= arr.length - 2 && /^[^0-9]{2,40}$/.test(part) && /librair|place des|amazon|fnac|cultura|decitre|babelio|payot|^livres?$/i.test(part))
      )
      .join(" - ")
      .trim();
    return {
      title,
      cover: metaContent(html, "og:image"),
    };
  } catch {
    return {};
  }
}

// Open Library serves covers directly by ISBN; ?default=false makes it 404
// instead of returning a 1x1 placeholder, so we can check it really exists.
async function coverByIsbn(isbn) {
  try {
    const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
    const res = await fetch(url, { method: "HEAD" });
    return res.ok ? url : "";
  } catch {
    return "";
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

  // Run all lookups in parallel and merge. Text fields: Open Library
  // (exact edition), then BNF (authoritative for French books, has
  // brand-new releases via the dépôt légal), then Google Books, then the
  // page's own OpenGraph tags. Covers: OL, Google, og:image, by-ISBN.
  const none = Promise.resolve({});
  const [ol, bnf, gb, page, isbnCover] = await Promise.all([
    isbn ? fromOpenLibrary(isbn) : none,
    isbn ? fromBnf(isbn) : none,
    isbn ? fromGoogleBooks(isbn) : none,
    fromPage(target.toString()),
    isbn ? coverByIsbn(isbn) : Promise.resolve(""),
  ]);

  // Last-resort title: bookshop URLs often carry a title slug right after
  // the ISBN (e.g. /livre/978…-les-lumieres-sombres-…/). No accents, but
  // better than an empty form.
  const slug = isbn
    ? target.pathname
        .match(new RegExp(`${isbn}-([a-z0-9-]+)`, "i"))?.[1]
        ?.replace(/-/g, " ")
        .replace(/^./, (c) => c.toUpperCase()) || ""
    : "";

  const result = {
    title: ol.title || bnf.title || gb.title || page.title || slug || "",
    author: ol.author || bnf.author || gb.author || "",
    year: ol.year || bnf.year || gb.year || "",
    cover: ol.cover || gb.cover || page.cover || isbnCover || "",
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
