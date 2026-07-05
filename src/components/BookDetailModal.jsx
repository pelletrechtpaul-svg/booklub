"use client";

import { useEffect } from "react";
import { PARTICIPANTS } from "@/lib/participants";
import Stars from "./Stars";

// Detail popup for one book: everyone's stars and a free-text comment per
// participant, plus editable proposer / debate date. Comments save on blur
// (tap outside the text area); star and select changes save immediately.
export default function BookDetailModal({ book, onUpdate, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const ratings = book.ratings || {};
  const comments = book.comments || {};

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>Fiche du livre</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <div className="detail-scroll">
          <div className="chosen-preview">
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
          </div>

          <div className="detail-fields">
            <label>
              Proposé par
              <select
                className="search-input"
                value={book.proposer || ""}
                onChange={(e) => onUpdate(book.id, { proposer: e.target.value })}
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
                value={book.debateDate || ""}
                onChange={(e) =>
                  onUpdate(book.id, { debateDate: e.target.value })
                }
              />
            </label>
          </div>

          <h3 className="detail-subtitle">Les avis du club</h3>

          {PARTICIPANTS.map((name) => (
            <div className="comment-block" key={name}>
              <div className="comment-head">
                <span className="rating-name">{name}</span>
                <Stars
                  value={ratings[name] || 0}
                  onChange={(v) => onUpdate(book.id, { [`ratings/${name}`]: v })}
                />
              </div>
              <textarea
                className="comment-input"
                // Uncontrolled on purpose: live realtime updates must not
                // clobber the text while someone is typing. Saved on blur.
                key={book.id + name}
                defaultValue={comments[name] || ""}
                placeholder={`L’avis de ${name}…`}
                rows={3}
                onBlur={(e) => {
                  const text = e.target.value.trim();
                  if (text !== (comments[name] || "")) {
                    onUpdate(book.id, { [`comments/${name}`]: text });
                  }
                }}
              />
            </div>
          ))}

          <p className="detail-hint">
            Les avis s’enregistrent automatiquement quand tu quittes la zone de
            texte.
          </p>
        </div>
      </div>
    </div>
  );
}
