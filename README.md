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
| `TAKO_BASE_URL` | Defaults to `https://trytako.com/api/v3`. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel KV. Without them, falls back to in-memory cache. |

The Tako key is **never** shipped to the browser; all calls go through `/api/receipt`.

## Deploy
`vercel deploy` (or connect the repo). Add a Vercel KV store and the env vars above.

## Live-data verification (run once Tako account has credit)

- [ ] Set TAKO_API_KEY locally; run one real `/api/receipt?company=Lockheed%20Martin`.
- [ ] Inspect the raw Tako JSON; confirm parseSearchResponse extracts value/embed_url/candidates correctly. Adjust ONLY lib/tako/client.ts if the shape differs.
- [ ] Confirm contracts + total are the SAME fiscal year; confirm the year label on the card.
- [ ] Spot-check 3 companies: a public contractor (Boeing), a private/no-revenue case, and a no-contracts case (e.g. a consumer brand). Verify each renders the correct variant.
- [ ] Verify "Save receipt" PNG and "Copy link" deep-link round-trip.
