"use client";
import type { Candidate } from "@/lib/tako/types";

export function Disambiguation({
  candidates,
  onPick,
}: {
  candidates: Candidate[];
  onPick: (name: string) => void;
}) {
  return (
    <div className="disambig">
      <p>Which one did you mean?</p>
      <ul>
        {candidates.map((c) => (
          <li key={c.entityId || c.name}>
            <button type="button" onClick={() => onPick(c.name)}>{c.name}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
