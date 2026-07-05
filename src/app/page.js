"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  addDoc,
  deleteDoc,
  doc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import Ranking from "@/components/Ranking";
import AddBookModal from "@/components/AddBookModal";

const booksRef = collection(db, "books");

export default function Home() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  // Live subscription — the ranking updates in real time for everyone.
  useEffect(() => {
    const q = query(booksRef, orderBy("order", "asc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setBooks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
    await addDoc(booksRef, {
      title: book.title,
      author: book.author,
      cover: book.cover || "",
      year: book.year || "",
      order: maxOrder + 1,
      createdAt: serverTimestamp(),
    });
  }

  async function removeBook(id) {
    await deleteDoc(doc(db, "books", id));
  }

  // Persist a reordered list by rewriting each book's `order` field.
  async function persistOrder(ordered) {
    setBooks(ordered); // optimistic update
    const batch = writeBatch(db);
    ordered.forEach((b, i) => {
      batch.update(doc(db, "books", b.id), { order: i + 1 });
    });
    await batch.commit();
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
        />
      )}

      <button className="fab" onClick={() => setAdding(true)}>
        <span aria-hidden>＋</span> Ajouter un livre
      </button>

      {adding && (
        <AddBookModal onAdd={addBook} onClose={() => setAdding(false)} />
      )}
    </main>
  );
}
