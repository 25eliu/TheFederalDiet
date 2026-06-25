#!/usr/bin/env node
// Live Tako probe — finds the optimal contract-search wording and reveals the real
// response shape so we can lock the parser to it.
//
// Usage:
//   TAKO_API_KEY=sk-... node scripts/probe-tako.mjs
//   TAKO_API_KEY=sk-... node scripts/probe-tako.mjs "Palantir"   # probe one company
//
// It prints, for each (company × wording): HTTP status, #cards, top card title,
// content.format, the raw content.data (truncated), and the value the app's
// extractor would pull. Use the output to pick the best `queries.contracts` phrasing
// in lib/receipt/build.ts and to confirm lib/tako/client.ts parses the real shape.

const API_KEY = process.env.TAKO_API_KEY;
if (!API_KEY) {
  console.error("Set TAKO_API_KEY first:  TAKO_API_KEY=sk-... node scripts/probe-tako.mjs");
  process.exit(1);
}

const SEARCH_URL = process.env.TAKO_SEARCH_URL ?? "https://tako.com/api/v3/search/";
const ANSWER_URL = process.env.TAKO_ANSWER_URL ?? "https://tako.com/api/v1/answer/";
const FY = 2025;

// Companies that DEFINITELY have large federal contracts — they must return data.
const COMPANIES = process.argv[2] ? [process.argv[2]] : ["RTX", "Lockheed Martin", "The Boeing Company"];

// Candidate wordings to compare. The winner becomes queries.contracts in build.ts.
const WORDINGS = [
  (c) => `${c} federal contract obligations FY${FY}`,
  (c) => `${c} total US federal government contract awards FY${FY} in dollars`,
  (c) => `${c} federal contracts awarded ${FY}`,
  (c) => `${c} USASpending federal contract obligations FY${FY}`,
];

// --- inlined copies of lib/tako/client.ts extraction (keep in sync) ---
function parseMagnitude(token) {
  if (!token) return null;
  const t = String(token).trim().toLowerCase().replace(/[$,]/g, "");
  const m = t.match(/^(-?\d+(?:\.\d+)?)\s*(t|tn|trillion|b|bn|billion|m|mn|million|k|thousand)?/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const s = m[2] ?? "";
  const mult = s.startsWith("t") ? 1e12 : s.startsWith("b") ? 1e9 : s.startsWith("m") ? 1e6
    : s.startsWith("k") || s === "thousand" ? 1e3 : 1;
  return n * mult;
}
function extractValue(content) {
  const data = content?.data;
  if (!data || typeof data !== "string") return null;
  if ((content.format ?? "").toLowerCase() === "csv") {
    const rows = data.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
    const dataRows = rows.length > 1 ? rows.slice(1) : rows;
    let last = null;
    for (const row of dataRows) for (const cell of row.split(",")) {
      const v = parseMagnitude(cell);
      if (v !== null) last = v;
    }
    return last;
  }
  const re = /\$?\s*-?\d[\d,]*(?:\.\d+)?\s*(?:trillion|billion|million|thousand|t|tn|bn|b|mn|m|k)?/gi;
  const tokens = data.match(re) ?? [];
  const cur = tokens.filter((t) => /\$|trillion|billion|million|thousand/i.test(t)).map(parseMagnitude).filter((n) => n !== null);
  if (cur.length) return cur[cur.length - 1];
  const nums = tokens.map(parseMagnitude).filter((n) => n !== null);
  return nums.length ? Math.max(...nums) : null;
}
// Parse the prose description (mirrors lib/tako/client.ts parseSeriesDescription).
function parseDescription(desc) {
  if (!desc || typeof desc !== "string") return { latest: null, timeline: null };
  const MONEY = String.raw`-?\$?-?[\d,]+(?:\.\d+)?\s*(?:trillion|billion|million|thousand|t|tn|bn|b|mn|m|k)?`;
  const DATE = String.raw`[A-Za-z]+\.?\s+\d{1,2},?\s+(\d{4})`;
  const latestM = desc.match(new RegExp(`latest value was\\s+(${MONEY})`, "i"));
  const rangeM = desc.match(new RegExp(`between\\s+${DATE}\\s+and\\s+${DATE}`, "i"));
  const maxM = desc.match(new RegExp(`maximum of\\s+(${MONEY})\\s+on\\s+${DATE}`, "i"));
  const startYear = rangeM ? parseInt(rangeM[1], 10) : null;
  const endYear = rangeM ? parseInt(rangeM[2], 10) : null;
  const peak = maxM ? parseMagnitude(maxM[1]) : null;
  const peakYear = maxM ? parseInt(maxM[2], 10) : null;
  const timeline = startYear || endYear || peak ? { startYear, endYear, peak, peakYear } : null;
  return { latest: latestM ? parseMagnitude(latestM[1]) : null, timeline };
}
const trunc = (s, n = 500) => (s.length > n ? `${s.slice(0, n)} …(${s.length} chars)` : s);

// Parse the underlying CSV series (mirrors lib/tako/client.ts parseCsvSeries).
function parseCsvSeries(content) {
  const data = content?.data;
  if (!data || typeof data !== "string") return [];
  const rows = data.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  if (rows.length < 2) return [];
  const pts = [];
  for (const row of rows.slice(1)) {
    const cells = row.split(",").map((c) => c.trim());
    let year = null, dateStr = "";
    for (const cell of cells) {
      const ym = cell.match(/\b(?:19|20)\d{2}\b/);
      if (ym) { year = parseInt(ym[0], 10); dateStr = cell; break; }
    }
    let value = null;
    for (let i = cells.length - 1; i >= 0; i--) {
      if (cells[i] === dateStr) continue;
      const v = parseMagnitude(cells[i]);
      if (v !== null) { value = v; break; }
    }
    if (year !== null && value !== null) pts.push({ date: dateStr, year, value });
  }
  return pts;
}

async function search(query, includeContents = false) {
  const body = { query, effort: "fast" };
  if (includeContents) body.sources = { tako: { include_contents: true }, web: {} };
  const res = await fetch(SEARCH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* leave raw */ }
  return { status: res.status, ok: res.ok, json, text };
}

async function main() {
  console.log(`\nSEARCH_URL = ${SEARCH_URL}`);
  console.log(`Probing: ${COMPANIES.join(", ")}\n${"=".repeat(70)}`);

  for (const company of COMPANIES) {
    console.log(`\n### ${company}`);
    for (const w of WORDINGS) {
      const query = w(company);
      try {
        // Request the underlying CSV series so we can see per-fiscal-year values.
        const { status, ok, json, text } = await search(query, true);
        if (!ok) {
          console.log(`  [${status}] "${query}"\n     ERROR: ${trunc(text, 300)}`);
          continue;
        }
        const cards = json?.cards ?? [];
        const top = cards[0];
        const fromDesc = parseDescription(top?.description);
        const series = parseCsvSeries(top?.content);
        const fromContent = extractValue(top?.content);
        const value = fromDesc.latest ?? fromContent;
        console.log(`  [${status}] "${query}"`);
        console.log(`     cards=${cards.length}  topTitle=${JSON.stringify(top?.title ?? null)}`);
        console.log(`     descLatest=${value}  timeline=${JSON.stringify(fromDesc.timeline)}  content.data=${top?.content?.data == null ? "null" : "present"}`);
        if (series.length) {
          console.log(`     series (${series.length} pts): ${series.map((p) => `${p.date}=${p.value}`).join("  ")}`);
        }
        if (top?.content?.data) console.log(`     content.data=${trunc(String(top.content.data), 400)}`);
        if (top?.embed_url) console.log(`     embed_url=${top.embed_url}`);
      } catch (e) {
        console.log(`  THREW for "${query}": ${e?.message ?? e}`);
      }
    }
  }

  // Market-cap check (Company Health stat) for the first company.
  console.log(`\n--- market cap (${COMPANIES[0]}) ---`);
  try {
    const { status, json } = await search(`${COMPANIES[0]} stock market cap`);
    const desc = json?.cards?.[0]?.description ?? "";
    const m = desc.match(/market cap(?:italization)?\s+(?:is|of|:)?\s*(\$?[\d.,]+\s*(?:trillion|billion|million|thousand|t|tn|bn|b|mn|m|k)?)/i);
    console.log(`  [${status}] marketCap=${m ? parseMagnitude(m[1]) : null}  desc=${trunc(String(desc), 200)}`);
  } catch (e) {
    console.log(`  market cap THREW: ${e?.message ?? e}`);
  }

  // One answer-endpoint check.
  console.log(`\n${"=".repeat(70)}\nANSWER_URL = ${ANSWER_URL}`);
  try {
    const res = await fetch(ANSWER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify({ query: `What are ${COMPANIES[0]}'s US federal contracts mainly for?`, effort: "fast", sources: { tako: {}, web: {} } }),
    });
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* raw */ }
    console.log(`  [${res.status}] answer=${JSON.stringify(json?.answer ?? null)}`);
    if (!res.ok) console.log(`     ERROR: ${trunc(text, 300)}`);
  } catch (e) {
    console.log(`  answer THREW: ${e?.message ?? e}`);
  }
  console.log("");
}

main();
