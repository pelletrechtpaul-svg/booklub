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
import Ranking from "@/components/Ranking";
import AddBookModal from "@/components/AddBookModal";
import BookDetailModal from "@/components/BookDetailModal";

export default function Home() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState(null);

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

  // Persist a reordered list with a single atomic multi-path update.
  async function persistOrder(ordered) {
    setBooks(ordered); // optimistic update
    const updates = {};
    ordered.forEach((b, i) => {
      updates[`${b.id}/order`] = i + 1;
    });
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

      {!error && !loading && books.length > 0 && (
        <Ranking
          books={books}
          onReorder={persistOrder}
          onRemove={removeBook}
          onUpdate={updateBook}
          onOpen={setOpenId}
        />
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
