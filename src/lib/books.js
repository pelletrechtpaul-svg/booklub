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
    "https://www.googleapis.com/books/v1/volumes?maxResults=10&country=FR&q=" +
    encodeURIComponent(q);

  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error("Pas de connexion à Google Books. Vérifie ton réseau.");
  }

  if (!res.ok) {
    // Surface the real reason (rate limit, etc.) so it's diagnosable.
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message || "";
    } catch {}
    if (res.status === 429) {
      throw new Error("Trop de recherches d’un coup. Réessaie dans un instant.");
    }
    throw new Error(
      `La recherche a échoué (${res.status})${detail ? " : " + detail : ""}`
    );
  }

  const data = await res.json();
  const items = data.items || [];

  // Keep every result; books without a cover just get a placeholder later.
  return items.map((item) => {
    const info = item.volumeInfo || {};
    const links = info.imageLinks || {};
    return {
      googleId: item.id,
      title: info.title || "Sans titre",
      author: (info.authors && info.authors.join(", ")) || "Auteur inconnu",
      year: info.publishedDate ? info.publishedDate.slice(0, 4) : "",
      cover: upgradeCover(links.thumbnail || links.smallThumbnail || ""),
    };
  });
}
