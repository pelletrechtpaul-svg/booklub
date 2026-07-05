"use client";

import { useEffect, useState } from "react";
import { searchBooks, importFromUrl } from "@/lib/books";
import { PARTICIPANTS } from "@/lib/participants";

export default function AddBookModal({ onAdd, onClose }) {
  // step: "search" | "manual" | "details"
  const [step, setStep] = useState("search");

  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Manual-entry fields.
  const [url, setUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [mTitle, setMTitle] = useState("");
  const [mAuthor, setMAuthor] = useState("");
  const [mYear, setMYear] = useState("");
  const [mCover, setMCover] = useState("");

  // The chosen book, then the details step.
  const [chosen, setChosen] = useState(null);
  const [proposer, setProposer] = useState("");
  const [debateDate, setDebateDate] = useState("");

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

  async function handleImport() {
    if (!url.trim()) return;
    setImporting(true);
    setError("");
    try {
      const info = await importFromUrl(url);
      if (info.title) setMTitle(info.title);
      if (info.author) setMAuthor(info.author);
      if (info.year) setMYear(info.year);
      if (info.cover) setMCover(info.cover);
    } catch (err) {
      console.error(err);
      setError(err.message || "Import impossible depuis ce lien.");
    } finally {
      setImporting(false);
    }
  }

  // Move a chosen book to the details step (proposer / debate date).
  function chooseSearch(book) {
    setChosen(book);
    setError("");
    setStep("details");
  }

  function chooseManual(e) {
    e.preventDefault();
    if (!mTitle.trim()) return;
    setChosen({
      title: mTitle.trim(),
      author: mAuthor.trim() || "Auteur inconnu",
      year: mYear.trim(),
      cover: mCover.trim(),
    });
    setError("");
    setStep("details");
  }

  async function confirmAdd(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onAdd({ ...chosen, proposer, debateDate, ratings: {} });
      onClose();
    } catch (err) {
      console.error(err);
      setError("Impossible d’ajouter le livre.");
      setSubmitting(false);
    }
  }

  function openManual() {
    setMTitle(q);
    setError("");
    setStep("manual");
  }

  const heading =
    step === "details"
      ? "Détails"
      : step === "manual"
      ? "Ajouter à la main"
      : "Ajouter un livre";

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>{heading}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        {/* ---- DETAILS STEP ---- */}
        {step === "details" && chosen && (
          <form className="manual-form" onSubmit={confirmAdd}>
            <div className="chosen-preview">
              {chosen.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="cover" src={chosen.cover} alt="" />
              ) : (
                <span className="cover cover-placeholder" aria-hidden>
                  📖
                </span>
              )}
              <div className="result-meta">
                <div className="result-title">{chosen.title}</div>
                <div className="result-author">
                  {chosen.author}
                  {chosen.year ? ` · ${chosen.year}` : ""}
                </div>
              </div>
            </div>

            <label>
              Proposé par
              <select
                className="search-input"
                value={proposer}
                onChange={(e) => setProposer(e.target.value)}
              >
                <option value="">—</option>
                {PARTICIPANTS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Date de débat
              <input
                className="search-input"
                type="date"
                value={debateDate}
                onChange={(e) => setDebateDate(e.target.value)}
              />
            </label>

            {error && <div className="state">{error}</div>}

            <div className="manual-actions">
              <button
                type="button"
                className="link-btn"
                onClick={() => setStep(chosen && mTitle ? "manual" : "search")}
              >
                ← Retour
              </button>
              <button className="btn" type="submit" disabled={submitting}>
                {submitting ? "…" : "Ajouter au classement"}
              </button>
            </div>
          </form>
        )}

        {/* ---- MANUAL STEP ---- */}
        {step === "manual" && (
          <form className="manual-form" onSubmit={chooseManual}>
            <label>
              Lien librairie (placedeslibraires.fr, Amazon…) — import automatique
              <div className="search-form">
                <input
                  className="search-input"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.placedeslibraires.fr/livre/…"
                />
                <button
                  type="button"
                  className="btn"
                  onClick={handleImport}
                  disabled={importing}
                >
                  {importing ? "…" : "Importer"}
                </button>
              </div>
            </label>

            <label>
              Titre *
              <input
                className="search-input"
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
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
                onClick={() => {
                  setError("");
                  setStep("search");
                }}
              >
                ← Revenir à la recherche
              </button>
              <button className="btn" type="submit">
                Continuer
              </button>
            </div>
          </form>
        )}

        {/* ---- SEARCH STEP ---- */}
        {step === "search" && (
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
              {loading && <p className="results-hint">Recherche…</p>}

              {!loading && !error && !searched && (
                <p className="results-hint">
                  Cherche un livre, puis choisis-le pour l’ajouter au classement.
                </p>
              )}

              {!loading && !error && searched && results.length === 0 && (
                <p className="results-hint">Aucun résultat pour « {q} ».</p>
              )}

              {results.map((book) => (
                <button
                  key={book.id}
                  className="result"
                  onClick={() => chooseSearch(book)}
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

            <button
              type="button"
              className="link-btn manual-link"
              onClick={openManual}
            >
              Tu ne trouves pas ton livre ? Ajoute-le à la main
            </button>
          </>
        )}
      </div>
    </div>
  );
}
