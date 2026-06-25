"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { SearchBox } from "@/components/SearchBox";
import { Receipt } from "@/components/Receipt";
import { Disambiguation } from "@/components/Disambiguation";
import type { ReceiptData } from "@/lib/receipt/types";

type View =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "data"; data: ReceiptData }
  | { kind: "error"; message: string };

export default function Home() {
  const [view, setView] = useState<View>({ kind: "idle" });
  const [initialCompany, setInitialCompany] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);
  const didInitialLoad = useRef(false);

  const search = useCallback(async (company: string) => {
    setView({ kind: "loading" });
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("c", company);
      window.history.replaceState({}, "", url);
    }
    try {
      const res = await fetch(`/api/receipt?company=${encodeURIComponent(company)}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data: ReceiptData = await res.json();
      setView({ kind: "data", data });
    } catch {
      setView({ kind: "error", message: "Could not reach the kitchen. Try again." });
    }
  }, []);

  // Deep-link load on first paint: only auto-search when a ?c= company is in the URL.
  // Otherwise we stay idle and show the explainer blurb. The ref guard prevents React
  // StrictMode's double-mount (dev) from firing two receipt fetches.
  useEffect(() => {
    if (didInitialLoad.current) return;
    didInitialLoad.current = true;
    const c = new URLSearchParams(window.location.search).get("c");
    if (c) {
      setInitialCompany(c);
      void search(c);
    }
  }, [search]);

  async function saveReceipt() {
    if (!cardRef.current) return;
    const dataUrl = await toPng(cardRef.current, { pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "federal-diet-receipt.png";
    a.click();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
  }

  return (
    <main className="page">
      <h1 className="wordmark">The Federal Diet</h1>
      <p className="tagline">How federally fed is your favorite company?</p>

      <SearchBox onSearch={search} loading={view.kind === "loading"} initial={initialCompany} />

      {view.kind === "idle" && (
        <section className="intro">
          <p>
            Every year, Uncle Sam hands out <strong>trillions</strong> in federal contracts —
            for fighter jets, cloud servers, paperclips, you name it. A lot of household-name
            companies quietly earn a big slice of their income straight from your tax dollars.
          </p>
          <p>
            Type a company above and we&apos;ll print a tongue-in-cheek <em>taxpayer receipt</em>:
            how much it rakes in from federal contracts, how that stacks up against its total
            revenue, and just how <strong>federally fed</strong> it really is.
          </p>
          <p className="introHint">Try Lockheed Martin, Palantir, or Booz Allen Hamilton →</p>
        </section>
      )}

      {view.kind === "loading" && <p className="status">Tallying the tab…</p>}
      {view.kind === "error" && <p className="status error">{view.message}</p>}

      {view.kind === "data" && view.data.status === "disambiguation" && (
        <Disambiguation candidates={view.data.candidates} onPick={search} />
      )}
      {view.kind === "data" && view.data.status === "error" && (
        <p className="status error">{view.data.error ?? "Something went wrong."}</p>
      )}

      {view.kind === "data" &&
        (view.data.status === "result" || view.data.status === "no-contracts") && (
          <>
            <div ref={cardRef} className="perf">
              <Receipt data={view.data} />
            </div>
            <div className="shareRow">
              <button type="button" onClick={saveReceipt}>Save receipt</button>
              <button type="button" onClick={copyLink}>Copy link</button>
            </div>
          </>
        )}
    </main>
  );
}
