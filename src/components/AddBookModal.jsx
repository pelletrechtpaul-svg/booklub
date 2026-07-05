"use client";

import { useEffect, useState } from "react";
import { searchBooks } from "@/lib/books";

export default function AddBookModal({ onAdd, onClose }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Manual-entry mode (fallback when a book isn't in the catalogue).
  const [manual, setManual] = useState(false);
  const [mTitle, setMTitle] = useState("");
  const [mAuthor, setMAuthor] = useState("");
  const [mYear, setMYear] = useState("");
  const [mCover, setMCover] = useState("");

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSearch(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    try {
      setResults(await searchBooks(q));
      setSearched(true);
    } catch (err) {
      console.error(err);
      setResults([]);
      setError(err.message || "La recherche a échoué. Réessaie.");
    } finally {
      setLoading(false);
    }
  }

  async function pick(book) {
    setSubmitting(true);
    try {
      await onAdd(book);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Impossible d’ajouter le livre.");
      setSubmitting(false);
    }
  }

  function openManual() {
    setMTitle(q); // prefill with what was typed in the search box
    setError("");
    setManual(true);
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    if (!mTitle.trim()) return;
    await pick({
      title: mTitle.trim(),
      author: mAuthor.trim() || "Auteur inconnu",
      year: mYear.trim(),
      cover: mCover.trim(),
    });
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{manual ? "Ajouter à la main" : "Ajouter un livre"}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        {manual ? (
          <form className="manual-form" onSubmit={handleManualSubmit}>
            <label>
              Titre *
              <input
                className="search-input"
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
                autoFocus
                required
              />
            </label>
            <label>
              Auteur
              <input
                className="search-input"
                value={mAuthor}
                onChange={(e) => setMAuthor(e.target.value)}
              />
            </label>
            <label>
              Année
              <input
                className="search-input"
                value={mYear}
                onChange={(e) => setMYear(e.target.value)}
                inputMode="numeric"
                placeholder="2026"
              />
            </label>
            <label>
              URL de couverture (facultatif)
              <input
                className="search-input"
                value={mCover}
                onChange={(e) => setMCover(e.target.value)}
                placeholder="https://…/couverture.jpg"
              />
            </label>

            {mCover.trim() && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="cover"
                src={mCover.trim()}
                alt=""
                style={{ alignSelf: "center" }}
              />
            )}

            {error && <div className="state">{error}</div>}

            <div className="manual-actions">
              <button
                type="button"
                className="link-btn"
                onClick={() => setManual(false)}
              >
                ← Revenir à la recherche
              </button>
              <button className="btn" type="submit" disabled={submitting}>
                {submitting ? "…" : "Ajouter au classement"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <form className="search-form" onSubmit={handleSearch}>
              <input
                className="search-input"
                placeholder="Titre, auteur, ISBN…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
              />
              <button className="btn" type="submit" disabled={loading}>
                {loading ? "…" : "Chercher"}
              </button>
            </form>

            {error && <div className="state">{error}</div>}

            <div className="results">
              {loading && (
                <p className="results-hint">Recherche…</p>
              )}

              {!loading && !error && !searched && (
                <p className="results-hint">
                  Cherche un livre, puis choisis-le pour l’ajouter au classement.
                </p>
              )}

              {!loading && !error && searched && results.length === 0 && (
                <p className="results-hint">
                  Aucun résultat pour « {q} ».
                </p>
              )}

              {results.map((book) => (
                <button
                  key={book.id}
                  className="result"
                  onClick={() => pick(book)}
                  disabled={submitting}
                >
                  {book.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="cover" src={book.cover} alt="" />
                  ) : (
                    <span className="cover cover-placeholder" aria-hidden>
                      📖
                    </span>
                  )}
                  <div className="result-meta">
                    <div className="result-title">{book.title}</div>
                    <div className="result-author">
                      {book.author}
                      {book.year ? ` · ${book.year}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button type="button" className="link-btn manual-link" onClick={openManual}>
              Tu ne trouves pas ton livre ? Ajoute-le à la main
            </button>
          </>
        )}
      </div>
    </div>
  );
}
