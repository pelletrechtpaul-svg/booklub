// Search books through the public Google Books API (no API key required, CORS-enabled).

function upgradeCover(url) {
  if (!url) return "";
  // Google returns http thumbnails; force https and drop the page-curl edge.
  return url.replace("http://", "https://").replace("&edge=curl", "");
}

export async function searchBooks(query) {
  const q = query.trim();
  if (!q) return [];

  const url =
    "https://www.googleapis.com/books/v1/volumes?maxResults=8&q=" +
    encodeURIComponent(q);

  const res = await fetch(url);
  if (!res.ok) throw new Error("La recherche a échoué");

  const data = await res.json();
  const items = data.items || [];

  return items
    .map((item) => {
      const info = item.volumeInfo || {};
      const links = info.imageLinks || {};
      return {
        googleId: item.id,
        title: info.title || "Sans titre",
        author: (info.authors && info.authors.join(", ")) || "Auteur inconnu",
        year: info.publishedDate ? info.publishedDate.slice(0, 4) : "",
        cover: upgradeCover(links.thumbnail || links.smallThumbnail || ""),
      };
    })
    .filter((b) => b.cover); // keep only results that have a cover to show
}
