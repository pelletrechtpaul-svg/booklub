// Search books through the Open Library API (Internet Archive).
// Free, no API key, CORS-enabled, and without the aggressive anonymous
// rate limiting that makes the Google Books API return 429 from browsers.

function coverUrl(coverId) {
  // Medium-size cover (~180px wide). Returns "" when there's no cover.
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : "";
}

export async function searchBooks(query) {
  const q = query.trim();
  if (!q) return [];

  const url =
    "https://openlibrary.org/search.json" +
    "?fields=key,title,author_name,first_publish_year,cover_i" +
    "&limit=12&q=" +
    encodeURIComponent(q);

  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error("Pas de connexion à Open Library. Vérifie ton réseau.");
  }

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("Trop de recherches d’un coup. Réessaie dans un instant.");
    }
    throw new Error(`La recherche a échoué (${res.status}).`);
  }

  const data = await res.json();
  const docs = data.docs || [];

  // Keep every result; books without a cover just get a placeholder later.
  return docs.map((doc) => ({
    id: doc.key, // e.g. "/works/OL893415W"
    title: doc.title || "Sans titre",
    author: (doc.author_name && doc.author_name.join(", ")) || "Auteur inconnu",
    year: doc.first_publish_year ? String(doc.first_publish_year) : "",
    cover: coverUrl(doc.cover_i),
  }));
}

// Import a book's info (title, author, year, cover) from a product URL
// (e.g. an Amazon link) via our own server route.
export async function importFromUrl(url) {
  const u = url.trim();
  if (!u) return {};
  const res = await fetch("/api/import?url=" + encodeURIComponent(u));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Import impossible depuis ce lien.");
  }
  return data;
}
