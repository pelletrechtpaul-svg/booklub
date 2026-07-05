"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function SortableBook({ book, rank, onRemove }) {
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

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={"book-row" + (isDragging ? " dragging" : "")}
    >
      <span className="rank-badge">{rank}</span>

      {book.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="cover" src={book.cover} alt={book.title} />
      ) : (
        <span className="cover cover-placeholder" aria-hidden>
          📖
        </span>
      )}

      <div className="book-meta">
        <div className="book-title">{book.title}</div>
        <div className="book-author">
          {book.author}
          {book.year ? ` · ${book.year}` : ""}
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
    </li>
  );
}
