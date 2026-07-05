"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PARTICIPANTS } from "@/lib/participants";
import Stars from "./Stars";

function formatDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function average(ratings) {
  const vals = PARTICIPANTS.map((p) => ratings?.[p] || 0).filter((v) => v > 0);
  if (!vals.length) return null;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
}

export default function SortableBook({ book, rank, onRemove, onUpdate, onOpen }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: book.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
  };

  const ratings = book.ratings || {};
  const avg = average(ratings);
  const commentCount = Object.values(book.comments || {}).filter(Boolean).length;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={"book-row" + (isDragging ? " dragging" : "")}
    >
      <div className="book-main">
        <div className="rank-col">
          <span className="rank-badge">{rank}</span>
          {avg && <span className="rank-avg">★ {avg}</span>}
        </div>

        <div
          className="book-open"
          onClick={() => onOpen(book.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && onOpen(book.id)}
          title="Voir la fiche et les avis"
        >
          {book.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="cover" src={book.cover} alt={book.title} />
          ) : (
            <span className="cover cover-placeholder" aria-hidden>
              📖
            </span>
          )}

          <div className="book-meta">
            <div className="book-title">
              {book.title}
              {commentCount > 0 && (
                <span className="comment-count">💬 {commentCount}</span>
              )}
            </div>
            <div className="book-author">
              {book.author}
              {book.year ? ` · ${book.year}` : ""}
            </div>
            <div className="book-sub">
              {book.proposer && <span>Proposé par {book.proposer}</span>}
              {book.debateDate && (
                <span>Débat le {formatDate(book.debateDate)}</span>
              )}
            </div>
          </div>
        </div>

        <button
          className="remove-btn"
          onClick={() => {
            if (confirm(`Retirer « ${book.title} » du classement ?`)) {
              onRemove(book.id);
            }
          }}
          aria-label={`Retirer ${book.title}`}
        >
          ✕
        </button>

        <span
          className="drag-handle"
          {...attributes}
          {...listeners}
          aria-label="Déplacer"
          title="Glisser pour réordonner"
        >
          ⠿
        </span>
      </div>

      <div className="ratings">
        {PARTICIPANTS.map((name) => (
          <div className="rating-row" key={name}>
            <span className="rating-name">{name}</span>
            <Stars
              value={ratings[name] || 0}
              onChange={(v) =>
                onUpdate(book.id, { [`ratings/${name}`]: v })
              }
            />
          </div>
        ))}
      </div>
    </li>
  );
}
