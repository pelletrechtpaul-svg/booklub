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

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>Ajouter un livre</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

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
            <p style={{ color: "var(--muted)", margin: "8px 4px" }}>
              Recherche…
            </p>
          )}

          {!loading && !error && !searched && (
            <p style={{ color: "var(--muted)", margin: "8px 4px" }}>
              Cherche un livre, puis choisis-le pour l’ajouter au classement.
            </p>
          )}

          {!loading && !error && searched && results.length === 0 && (
            <p style={{ color: "var(--muted)", margin: "8px 4px" }}>
              Aucun résultat pour « {q} ». Essaie un autre titre ou l’ISBN.
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
      </div>
    </div>
  );
}
