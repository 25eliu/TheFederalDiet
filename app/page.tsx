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
  const [initialCompany, setInitialCompany] = useState("Lockheed Martin");
  const cardRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (company: string) => {
    setView({ kind: "loading" });
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("c", company);
      window.history.replaceState({}, "", url);
    }
    try {
      const res = await fetch(`/api/receipt?company=${encodeURIComponent(company)}`);
      const data: ReceiptData = await res.json();
      setView({ kind: "data", data });
    } catch {
      setView({ kind: "error", message: "Could not reach the kitchen. Try again." });
    }
  }, []);

  // Default / deep-link load on first paint.
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("c") ?? "Lockheed Martin";
    setInitialCompany(c);
    void search(c);
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
