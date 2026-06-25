# The Federal Diet — Design Spec

**Date:** 2026-06-24
**Status:** Approved for planning

## 1. Concept

A single-page web app. Someone types a company name and instantly gets a shareable,
screenshot-ready "taxpayer receipt" framing the company as eating at the federal
table — measuring how *federally fed* it is (how much of its revenue is federal
contract money). Lighthearted, factual, non-partisan, built to be screenshotted and
posted to social.

Tone: food/diet vernacular used lightly (consumed, feeds on, federally fed) — flavor,
not a pun on every line. Never editorialize on whether contracts are good or bad; just
the numbers, with a wink.

**Inviolable rule: every number is real and sourced. Never fabricate.** A missing
value renders as "data unavailable" and its line is hidden — never guessed.

## 2. Architecture

**Next.js (App Router) on Vercel.** Three layers:

- **Client** — one route (`/`), one `<Receipt>` card component plus a search box.
  Holds UI state: `idle → loading → result | no-contracts | private-company |
  disambiguation | error`. Exports the card to PNG (`html-to-image`) and copies a
  shareable deep link (`/?c=lockheed-martin`).
- **API route** (`/api/receipt`) — the secret-holding proxy. The Tako API key never
  reaches the client.
- **Tako** — reached server-side over Tako's REST API (`/api/v3/...`) with
  `TAKO_API_KEY` stored as a Vercel environment variable.

### Honest constraints
- The Tako MCP tools available during design exist only inside the agent session; the
  **deployed app must call Tako's HTTP API directly** with its own key.
- The probed Tako account is at **$0.00 balance**. Live data cannot be pulled by the
  app (or verified) until the account is funded. Build against documented response
  shapes; verify against live data once credit exists.

### Why these choices
- **Server proxy (not client-side key):** a browser-shipped key is public and would let
  anyone drain paid credits. Standard practice keeps the secret server-side.
- **Vercel KV cache:** the app is designed to go viral, so the same companies (Lockheed,
  Boeing, Palantir…) are searched repeatedly. A shared, persistent cache means a viral
  company is fetched from Tako **once**, then served from cache — bounding cost.

## 3. The `/api/receipt` flow

Endpoint: `GET /api/receipt?company=<name>`

1. **Normalize** the company name → cache key (`normalizedName + fiscalYear`).
2. **Vercel KV lookup.** Cache hit returns immediately with **no Tako cost**.
3. **Cache miss → fire Tako calls in parallel.** Each is a **separate** call per the
   reliability rule below; the app does **not** ask Tako to join data:
   - **Federal contracts by company** (vendor entity) — USASpending / U.S. Treasury.
   - **Total federal contract obligations** for the same fiscal year (the denominator).
   - **Company financials** — revenue and net income (S&P Global).
   - **Stock performance** — 1-year price change (Xignite).
   - **`tako_answer`** (sources `["tako","web"]`) — a 1–2 sentence plain-English
     explanation of *what* the contracts are for (e.g. "mainly DoD aircraft, missile,
     and space programs").
4. **Compute all ratios in code** from those separate results (see §4).
5. **Assemble** a typed `Receipt` JSON, write to KV with a **24h TTL**, and return it.

### CRITICAL reliability rule
Tako stores **contract data under a "vendor" entity** and **financials under a
"company" entity**, and they do **not** reliably auto-join. A single combined query
("contracts as a % of revenue") often returns null. Therefore: fetch contracts, total
federal obligations, financials, and stock as **separate** calls, and do **all ratio
math in code**. Always pull the contract figure and the total for the **same fiscal
year**, and label that year on the card.

### Branching (owned by the route)
- **No contracts found** → `status: "no-contracts"` (celebratory flip on the client).
- **Multiple entity matches** → `status: "disambiguation"`, `candidates: [...]`.
- **No revenue (private company)** → `private: true`; client hides the stamp.
- **Tako/network error** → `status: "error"`; client shows honest retry, never a
  fabricated number.

## 4. The math (computed server-side, shown as "the work")

Given `contracts` (company federal contract $), `totalFederalContracts`, `revenue`:

1. **Share of all federal contract spending** = `contracts / totalFederalContracts`
   → "X% of all federal contract dollars."
2. **How federally fed** = `contracts / revenue` → the headline diet stat:
   "X% of [Company]'s revenue is federal money." This is the **FEDERALLY FED** stamp.
   Skipped if revenue is unavailable.
3. **Receipt ledger lines:**
   - "Of every $100 in federal contract spending, $Y went to [Company]" = `share1 * 100`
   - "Of every $1 of company revenue, $Z is federal" = `share2`

Round for readability. Formatting (`$14.1B`, `36.8%`) lives in pure functions.

## 5. The receipt card (UI)

A single vertical card, ~560px max width, mobile-first, made to screenshot. Top to bottom:

- **Eyebrow:** `THE FEDERAL DIET · RECEIPT · FY[year] · NO.####`
- **Pre-headline:** small-caps "On the federal diet" + huge company name.
- **Hero number:** federal contract $ + "consumed in fed. contracts" (e.g. "$14.1B").
- **Signature element — a diagonal red rubber stamp** showing the federally-fed % with
  the label **"FEDERALLY FED"**. The viral money-shot. Hidden for private companies.
- **Two columns:**
  - *Federal Contracts:* contract $, rank among all vendors, share of all federal contracts.
  - *Company Health:* revenue, net income, 1-yr stock change (green up / red down).
- **Receipt ledger lines** with dotted leaders (the "$ per $100" / "$ per $1" lines).
- **Explanation:** the italic 1–2 sentence Tako answer.
- **Footer:** sources (U.S. Treasury / USASpending, S&P Global, Xignite, via Tako) +
  barcode flourish + "Open in Tako" link (to the contract card's embed URL).
- **Share row:** "Save receipt" (export card as PNG) and "Copy link."

Always show the fiscal year and a note that "figures = obligations" so the framing is honest.

### Aesthetic
Stamped Treasury-document / thermal-receipt vibe — **not** a generic SaaS card. Aged
document paper (off-white, faint green ruling), currency green `#1B4D3E` for money,
near-black ink, one red stamp `#B0271F`. Perforated top/bottom edges. Spend the boldness
on the stamp; keep everything else quiet and precise.

Type: **Archivo Black** (company name, heavy condensed sans), **JetBrains Mono** (all
data/numbers), **Spectral** (the explanation, serif).

Accessibility: visible focus states, reduced-motion respected, responsive to mobile.

### Graceful degradation & determinism (design additions)
- Any single field Tako does not return — "rank among all vendors" is the likeliest —
  renders as `data unavailable` and its line is hidden, never faked.
- The receipt number `NO.####` is a **deterministic hash of company + fiscal year**, so
  re-sharing the same company reproduces the same receipt.

## 6. Edge cases → states

| Condition | State | Client behavior |
|---|---|---|
| Contracts found, revenue present | `result` | Full card incl. FEDERALLY FED stamp |
| No federal contracts | `no-contracts` | Celebratory: "Good news — [Company] isn't on the federal diet." |
| Multiple entity matches | `disambiguation` | Pick-list of close matches / refine prompt |
| Contracts present, no revenue | `private-company` | Contracts + share line; stamp hidden |
| Tako/network failure | `error` | Honest message + retry; no fabricated numbers |

## 7. Testing

- **Unit:** ratio math + number/percent formatting (pure functions) → easy 80%+.
- **Integration:** `/api/receipt` against a mocked Tako client covering all five
  branches plus cache hit/miss.
- **Default load:** **Lockheed Martin** renders on first paint, seeded into KV so the
  page is never empty even before the Tako account is funded.

## 8. Out of scope (v1)

- Accounts, history, saved receipts beyond the share link.
- Comparison / multi-company views.
- Any editorial or partisan framing.
- Autocomplete beyond Tako's own match candidates.
