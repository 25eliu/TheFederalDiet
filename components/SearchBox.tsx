"use client";
import { useState } from "react";

export function SearchBox({
  onSearch,
  loading,
  initial,
}: {
  onSearch: (company: string) => void;
  loading: boolean;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSearch(trimmed);
  }
  return (
    <form onSubmit={submit} className="searchRow">
      <input
        type="text"
        aria-label="Company name"
        placeholder="Type a company…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit" disabled={loading}>
        {loading ? "Tallying…" : "Generate receipt"}
      </button>
    </form>
  );
}
