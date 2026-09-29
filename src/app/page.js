"use client";

import { useEffect, useState } from "react";
import {
  ref,
  onValue,
  push,
  remove,
  update,
  serverTimestamp,
} from "firebase/database";
import { getDb } from "@/lib/firebase";
import { CATEGORIES } from "@/lib/categories";
import Ranking from "@/components/Ranking";
import AddBookModal from "@/components/AddBookModal";
import BookDetailModal from "@/components/BookDetailModal";

export default function Home() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState(null);

  // One ranking per category, stacked. Books without a (known) category
  // land in an extra "À classer" section until someone sets it.
  const sections = [
    ...CATEGORIES.map((c) => ({
      label: c,
      books: books.filter((b) => b.category === c),
    })),
    {
      label: "À classer",
      unclassified: true,
      books: books.filter((b) => !CATEGORIES.includes(b.category)),
    },
  ];

  // Live subscription — the ranking updates in real time for everyone.
  useEffect(() => {
    let database;
    try {
      database = getDb();
    } catch (err) {
      console.error(err);
      setError(
        "Connexion à la base impossible. Vérifie la configuration Firebase."
      );
      setLoading(false);
      return;
    }
    const unsub = onValue(
      ref(database, "books"),
      (snap) => {
        const val = snap.val() || {};
        const list = Object.entries(val)
          .map(([id, data]) => ({ id, ...data }))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        setBooks(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError(
          "Connexion à la base impossible. Vérifie la configuration Firebase."
        );
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  async function addBook(book) {
    // New books go to the bottom of the ranking.
    const maxOrder = books.reduce((m, b) => Math.max(m, b.order ?? 0), 0);
    await push(ref(getDb(), "books"), {
      title: book.title,
      author: book.author,
      cover: book.cover || "",
      year: book.year || "",
      proposer: book.proposer || "",
      debateDate: book.debateDate || "",
      category: book.category || "",
      ratings: book.ratings || {},
      order: maxOrder + 1,
      createdAt: serverTimestamp(),
    });
  }

  async function removeBook(id) {
    await remove(ref(getDb(), `books/${id}`));
  }

  // Patch a single book (proposer, debate date, a participant's rating…).
  async function updateBook(id, patch) {
    await update(ref(getDb(), `books/${id}`), patch);
  }

  // Persist a reorder within one section. The subset keeps the global
  // order slots it already occupied — reassigned in the new arrangement —
  // so the other sections' ordering is untouched.
  async function persistOrder(orderedSubset) {
    const slots = orderedSubset
      .map((b) => b.order ?? 0)
      .sort((a, b) => a - b);
    const newOrderById = {};
    orderedSubset.forEach((b, i) => {
      newOrderById[b.id] = slots[i];
    });

    // Optimistic update.
    setBooks((prev) =>
      prev
        .map((b) =>
          newOrderById[b.id] !== undefined
            ? { ...b, order: newOrderById[b.id] }
            : b
        )
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    );

    const updates = {};
    for (const [id, order] of Object.entries(newOrderById)) {
      updates[`${id}/order`] = order;
    }
    await update(ref(getDb(), "books"), updates);
  }

  return (
    <main className="page">
      <header className="header">
        <h1>📚 Le classement du book club</h1>
        <p>Glisse un livre pour le faire monter ou descendre.</p>
      </header>

      {error && <div className="state">{error}</div>}

      {!error && loading && <div className="state">Chargement…</div>}

      {!error && !loading && books.length === 0 && (
        <div className="state">
          Aucun livre pour l’instant. Ajoute le premier avec le bouton
          ci-dessous !
        </div>
      )}

      {!error &&
        !loading &&
        books.length > 0 &&
        sections.map(
          (section) =>
            // "À classer" only shows while it has books; the two real
            // categories always show, with a hint when empty.
            (!section.unclassified || section.books.length > 0) && (
              <section className="ranking-section" key={section.label}>
                <h2 className="section-title">
                  {section.label}
                  <span className="section-count">{section.books.length}</span>
                </h2>
                {section.unclassified && (
                  <p className="section-hint">
                    Tape sur un livre pour lui donner une catégorie.
                  </p>
                )}
                {section.books.length === 0 ? (
                  <p className="section-hint">Aucun livre pour l’instant.</p>
                ) : (
                  <Ranking
                    books={section.books}
                    onReorder={persistOrder}
                    onRemove={removeBook}
                    onUpdate={updateBook}
                    onOpen={setOpenId}
                  />
                )}
              </section>
            )
        )}

      <button className="fab" onClick={() => setAdding(true)}>
        <span aria-hidden>＋</span> Ajouter un livre
      </button>

      {adding && (
        <AddBookModal onAdd={addBook} onClose={() => setAdding(false)} />
      )}

      {openId && books.find((b) => b.id === openId) && (
        <BookDetailModal
          book={books.find((b) => b.id === openId)}
          onUpdate={updateBook}
          onClose={() => setOpenId(null)}
        />
      )}
    </main>
  );
}
