"use client";

import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import SortableBook from "./SortableBook";

export default function Ranking({ books, onReorder, onRemove, onUpdate, onOpen }) {
  // A small activation distance/delay so taps and scrolls aren't hijacked,
  // while a deliberate drag still feels immediate and natural.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = books.findIndex((b) => b.id === active.id);
    const newIndex = books.findIndex((b) => b.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    onReorder(arrayMove(books, oldIndex, newIndex));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={books.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <ol className="ranking">
          {books.map((book, index) => (
            <SortableBook
              key={book.id}
              book={book}
              rank={index + 1}
              onRemove={onRemove}
              onUpdate={onUpdate}
              onOpen={onOpen}
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
