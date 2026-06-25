# The Federal Diet

Type a company → get a screenshot-ready "taxpayer receipt" of how federally fed it is.
All figures are live from Tako (U.S. Treasury / USASpending, S&P Global, Xignite).

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

## Probe the live Tako API (find the best wording + confirm the response shape)

```bash
TAKO_API_KEY=sk-... node scripts/probe-tako.mjs            # RTX, Lockheed, Boeing
TAKO_API_KEY=sk-... node scripts/probe-tako.mjs "Palantir" # one company
```
Prints, per company × wording: HTTP status, #cards, the top card's `content.format`,
the raw `content.data`, and the dollar value the app would extract. Use it to pick the
winning phrasing for `queries.contracts` in `lib/receipt/build.ts` and to confirm
`extractValueFromContent` reads the real `content.data` layout.

## Deploy
`vercel deploy` (or connect the repo). Add a Vercel KV store and the env vars above.

## Live-data verification (run once Tako account has credit)

- [ ] Run `node scripts/probe-tako.mjs` and read the raw `content.data` for RTX/Lockheed/Boeing. Confirm `extractValueFromContent` (in `lib/tako/client.ts`) reads the real CSV/text layout; if the data is CSV with a value column other than the last cell, adjust the extractor's cell-selection there.
- [ ] Pick the wording that reliably returns a contract figure and set it as `queries.contracts` (and `queries.total`) in `lib/receipt/build.ts`.
- [ ] Confirm contracts + total are the SAME fiscal year; confirm the year label on the card.
- [ ] Spot-check 3 companies: a public contractor (Boeing), a private/no-revenue case, and a no-contracts case (e.g. a consumer brand). Verify each renders the correct variant.
- [ ] Verify "Save receipt" PNG and "Copy link" deep-link round-trip.
