"use client";
import { useEffect, useMemo, useState } from "react";
import { suggestCompanies } from "@/lib/autocomplete";

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
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // Sync to deep-link / programmatic changes without popping the dropdown.
  useEffect(() => {
    setValue(initial);
    setOpen(false);
    setActive(-1);
  }, [initial]);

  const suggestions = useMemo(() => suggestCompanies(value, 6), [value]);
  const showList = open && suggestions.length > 0;

  function run(query: string) {
    const trimmed = query.trim();
    setOpen(false);
    setActive(-1);
    if (trimmed) onSearch(trimmed);
  }

  function choose(name: string) {
    setValue(name);
    run(name);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (showList && active >= 0 && suggestions[active]) {
      choose(suggestions[active].name);
    } else {
      run(value);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <form onSubmit={submit} className="searchRow" role="search">
      <div className="comboWrap">
        <input
          type="text"
          aria-label="Company name"
          placeholder="Type a company…"
          value={value}
          role="combobox"
          aria-expanded={showList}
          aria-controls="company-listbox"
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `company-opt-${active}` : undefined}
          autoComplete="off"
          onChange={(e) => {
            setValue(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => value && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
        />
        {showList && (
          <ul className="comboList" id="company-listbox" role="listbox">
            {suggestions.map((s, i) => (
              <li
                key={s.name}
                id={`company-opt-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? "comboOpt comboOptActive" : "comboOpt"}
                onMouseEnter={() => setActive(i)}
                // mousedown fires before input blur, so the click isn't lost
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(s.name);
                }}
              >
                {s.name}
              </li>
            ))}
          </ul>
        )}
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "Tallying…" : "Generate receipt"}
      </button>
    </form>
  );
}
