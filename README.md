# The Federal Diet

Type a company → get a screenshot-ready "taxpayer receipt" of how federally fed it is.
All figures are live from Tako (U.S. Treasury / USASpending, S&P Global, Xignite).

## How the numbers are derived
- **Federal contracts (hero):** Tako's "Federal Contract Obligations" series, picking the
  **latest COMPLETE fiscal year** (the current in-progress FY is excluded). The series is
  annual, stamped Oct 1; a point dated Oct 1 of year Y belongs to FY Y+1
  (`fiscalYearOfPoint` / `pickLatestCompleteFiscalYear` in `lib/receipt/build.ts`). Requires
  the underlying CSV via `include_contents`.
- **Denominator (share of all federal contracts):** a configured constant per fiscal year in
  `TOTAL_FEDERAL_CONTRACTS_BY_FY` (`lib/constants.ts`) — **update this each fiscal year**
  (FY2025 ≈ $681.3B). A live search was removed because it mis-matched a company named "Total SA".
- **Company Health:** revenue, net income, and **market cap** (parsed from the stock card's
  description). The unreliable "stock 1-yr change" was dropped.
- **Autocomplete:** a curated list of top contractors (`lib/companies.ts`) with client-side
  fuzzy matching (`lib/autocomplete.ts`) — no Tako calls.

## Local dev
```bash
npm install
npm run dev        # http://localhost:3000 (serves Lockheed seed without a key)
npm test           # vitest
```

## Environment variables (Vercel project settings)
| Var | Purpose |
|-----|---------|
| `TAKO_API_KEY` | Server-only Tako key. Without it, only the Lockheed seed renders. |
| `TAKO_SEARCH_URL` | Defaults to `https://tako.com/api/v3/search/`. |
| `TAKO_ANSWER_URL` | Defaults to `https://tako.com/api/v1/answer/`. |
| `TAKO_DEBUG` | `1`/unset = log every Tako request, status, raw payload, and extracted value; `0` = quiet. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel KV. Without them, falls back to in-memory cache. |

The Tako key is **never** shipped to the browser; all calls go through `/api/receipt`.

## Probe the live Tako API (confirm the series + FY selection)

```bash
TAKO_API_KEY=sk-... node scripts/probe-tako.mjs            # RTX, Lockheed, Boeing
TAKO_API_KEY=sk-... node scripts/probe-tako.mjs "Palantir" # one company
```
Requests `include_contents` and prints, per company × wording: the description's "latest
value", the parsed **CSV series** (per-fiscal-year points), the timeline, and the market-cap
parse. Use it to confirm `pickLatestCompleteFiscalYear` selects the right year and value.
(The MCP connectors are unusable — $0 balance + a server-side schema bug — so probe with the
app's `TAKO_API_KEY`.)

## Deploy
`vercel deploy` (or connect the repo). Add a Vercel KV store and the env vars above.

## Live-data verification

- [ ] Run `node scripts/probe-tako.mjs`; read the printed CSV series for Lockheed/RTX/Boeing. Confirm the date→FY mapping (`fiscalYearOfPoint`) and that `pickLatestCompleteFiscalYear` returns a sensible FY2025 value (not the partial latest point). Adjust the mapping in `lib/receipt/build.ts` if Tako's cadence differs.
- [ ] Confirm the "$ of every $100" line is < $100 (denominator = `TOTAL_FEDERAL_CONTRACTS_BY_FY`).
- [ ] Confirm market cap renders in Company Health.
- [ ] Spot-check a public contractor (Boeing), a private/no-revenue case, and a no-contracts case (consumer brand). Verify each variant.
- [ ] Verify "Save receipt" PNG and "Copy link" deep-link round-trip; type-ahead suggests companies mid-type.
- [ ] Each fiscal year: update `TOTAL_FEDERAL_CONTRACTS_BY_FY`.
