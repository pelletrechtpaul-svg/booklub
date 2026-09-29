"use client";

// A 1–10 star rating. Click a star to set the value; click the current
// value again to clear it. Read-only when onChange is omitted.
const STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export default function Stars({ value = 0, onChange }) {
  const readOnly = typeof onChange !== "function";
  return (
    <span className={"stars" + (readOnly ? " stars-ro" : "")}>
      {STEPS.map((n) => (
        <button
          key={n}
          type="button"
          className={"star" + (n <= value ? " on" : "")}
          onClick={
            readOnly ? undefined : () => onChange(n === value ? 0 : n)
          }
          disabled={readOnly}
          aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
          title={`${n}/10`}
        >
          {n <= value ? "★" : "☆"}
        </button>
      ))}
    </span>
  );
}
