# The Federal Diet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single-page Next.js app where typing a company name produces a shareable, screenshot-ready "taxpayer receipt" showing how federally fed that company is, with all numbers sourced live from Tako.

**Architecture:** Next.js (App Router) on Vercel. The browser calls our own `/api/receipt` route; that route holds the `TAKO_API_KEY`, fires separate Tako calls (contracts, total federal obligations, financials, stock, explanation), computes all ratios in code, caches the assembled result in Vercel KV (24h TTL), and returns typed JSON. The client renders one `<Receipt>` card and exports it to PNG.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Vitest + React Testing Library (jsdom) · `@vercel/kv` · `html-to-image` · `next/font/google` (Archivo Black, JetBrains Mono, Spectral).

## Global Constraints

- **Never fabricate a number.** A missing value renders the literal string `data unavailable` and its line is hidden. No guessing, no placeholders in output.
- **No editorializing** on whether contracts are good or bad. Numbers, with a wink only.
- **Separate Tako calls + ratios in code.** Never ask Tako to join vendor↔company data. Contracts and the federal total must be the **same fiscal year**.
- **Fiscal year is labeled** on every card; note that "figures = obligations."
- **The Tako API key is server-only.** It must never appear in client bundles or responses.
- **Default fiscal year:** `2025`. Constant `FISCAL_YEAR = 2025` in `lib/constants.ts`.
- **Colors:** paper off-white, money `#1B4D3E`, stamp `#B0271F`, near-black ink.
- **Fonts:** Archivo Black (company name), JetBrains Mono (all numbers/data), Spectral (explanation).
- **Card:** ~560px max width, mobile-first, visible focus states, `prefers-reduced-motion` respected.
- **Default example:** Lockheed Martin renders on first paint from a seed, so the page is never empty.
- **Tone vernacular** (light): "consumed", "feeds on", "federally fed". Flavor, not a pun per line.

> **Live-data caveat for the implementer:** The probed Tako account is at $0.00 balance and the exact `/api/v3` response JSON is unverified. Task 4 defines a strict `TakoClient` interface that the rest of the app depends on; the HTTP parsing in Task 4 is the ONLY place that touches Tako's wire format and is explicitly flagged for verification against a live response. All other tasks test against an in-memory fake client and need no live credit.

---

### Task 1: Project scaffold + test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`, `vitest.setup.ts`, `.gitignore`, `.env.example`
- Create: `app/layout.tsx`, `app/page.tsx` (placeholder), `lib/constants.ts`
- Test: `lib/constants.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `FISCAL_YEAR: number`, `MONEY_GREEN`, `STAMP_RED`, `PAPER`, `INK` color constants, `TAKO_BASE_URL` default; a working `npm test` (vitest) and `npm run dev`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "the-federal-diet",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "@vercel/kv": "2.0.0",
    "html-to-image": "1.11.11"
  },
  "devDependencies": {
    "typescript": "5.5.4",
    "@types/node": "20.14.0",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "vitest": "2.0.5",
    "@vitejs/plugin-react": "4.3.1",
    "@testing-library/react": "16.0.0",
    "@testing-library/jest-dom": "6.4.8",
    "jsdom": "24.1.1"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create config files**

`next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
export default nextConfig;
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: { alias: { "@": resolve(__dirname, ".") } },
});
```

`vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

`.gitignore`:
```
node_modules
.next
.env*.local
.vercel
*.tsbuildinfo
next-env.d.ts
```

`.env.example`:
```
TAKO_API_KEY=your-tako-api-key
TAKO_BASE_URL=https://trytako.com/api/v3
KV_REST_API_URL=
KV_REST_API_TOKEN=
```

- [ ] **Step 4: Write the failing test for constants**

`lib/constants.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { FISCAL_YEAR, MONEY_GREEN, STAMP_RED, TAKO_BASE_URL } from "./constants";

describe("constants", () => {
  it("defaults fiscal year to 2025", () => {
    expect(FISCAL_YEAR).toBe(2025);
  });
  it("uses the spec colors", () => {
    expect(MONEY_GREEN).toBe("#1B4D3E");
    expect(STAMP_RED).toBe("#B0271F");
  });
  it("defaults the Tako base url", () => {
    expect(TAKO_BASE_URL).toBe("https://trytako.com/api/v3");
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm install && npm test -- lib/constants.test.ts`
Expected: FAIL — cannot find module `./constants`.

- [ ] **Step 6: Create `lib/constants.ts`**

```ts
export const FISCAL_YEAR = 2025;

export const MONEY_GREEN = "#1B4D3E";
export const STAMP_RED = "#B0271F";
export const PAPER = "#F4F1E8";
export const INK = "#1A1A17";

export const TAKO_BASE_URL = process.env.TAKO_BASE_URL ?? "https://trytako.com/api/v3";
export const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h
```

- [ ] **Step 7: Create minimal app shell**

`app/layout.tsx`:
```tsx
import type { ReactNode } from "react";

export const metadata = {
  title: "The Federal Diet",
  description: "How federally fed is your favorite company?",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx`:
```tsx
export default function Home() {
  return <main>The Federal Diet</main>;
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- lib/constants.test.ts`
Expected: PASS (3 tests). Also confirm `npm run dev` serves `/` without error.

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json next.config.mjs vitest.config.ts vitest.setup.ts .gitignore .env.example app lib
git commit -m "chore: scaffold Next.js app with vitest harness"
```

---

### Task 2: Number & receipt formatting (pure functions)

**Files:**
- Create: `lib/format.ts`
- Test: `lib/format.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `formatCompactUSD(n: number | null): string` — `$14.1B`, `$250M`, `$980K`, `$500`, or `data unavailable` for null.
  - `formatPercent(fraction: number | null, decimals?: number): string` — `0.368 → "36.8%"`, null → `data unavailable`.
  - `formatSignedPercent(fraction: number | null): string` — `-0.052 → "−5.2%"`, `0.13 → "+13.0%"`.
  - `formatUSD2(n: number | null): string` — `$36.80` for ledger "$ per $100" lines.
  - `receiptNumber(company: string, fiscalYear: number): string` — deterministic 4-digit string, e.g. `"4827"`.

- [ ] **Step 1: Write the failing test**

`lib/format.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  formatCompactUSD,
  formatPercent,
  formatSignedPercent,
  formatUSD2,
  receiptNumber,
} from "./format";

describe("formatCompactUSD", () => {
  it("abbreviates billions/millions/thousands", () => {
    expect(formatCompactUSD(14_100_000_000)).toBe("$14.1B");
    expect(formatCompactUSD(250_000_000)).toBe("$250M");
    expect(formatCompactUSD(980_000)).toBe("$980K");
    expect(formatCompactUSD(500)).toBe("$500");
  });
  it("shows data unavailable for null", () => {
    expect(formatCompactUSD(null)).toBe("data unavailable");
  });
});

describe("formatPercent", () => {
  it("formats a fraction to one decimal", () => {
    expect(formatPercent(0.368)).toBe("36.8%");
    expect(formatPercent(0.035, 2)).toBe("3.50%");
  });
  it("handles null", () => {
    expect(formatPercent(null)).toBe("data unavailable");
  });
});

describe("formatSignedPercent", () => {
  it("prefixes sign and uses a real minus", () => {
    expect(formatSignedPercent(0.13)).toBe("+13.0%");
    expect(formatSignedPercent(-0.052)).toBe("−5.2%");
  });
});

describe("formatUSD2", () => {
  it("formats to two decimals", () => {
    expect(formatUSD2(36.8)).toBe("$36.80");
    expect(formatUSD2(null)).toBe("data unavailable");
  });
});

describe("receiptNumber", () => {
  it("is deterministic and four digits", () => {
    const a = receiptNumber("Lockheed Martin", 2025);
    const b = receiptNumber("Lockheed Martin", 2025);
    expect(a).toBe(b);
    expect(a).toMatch(/^\d{4}$/);
  });
  it("differs by company", () => {
    expect(receiptNumber("Boeing", 2025)).not.toBe(receiptNumber("Palantir", 2025));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/format.test.ts`
Expected: FAIL — cannot find module `./format`.

- [ ] **Step 3: Write the implementation**

`lib/format.ts`:
```ts
const UNAVAILABLE = "data unavailable";

export function formatCompactUSD(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return UNAVAILABLE;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}$${trim(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}$${trim(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}$${trim(abs / 1e3)}K`;
  return `${sign}$${Math.round(abs)}`;
}

// Drop a trailing ".0" so 250.0 -> "250" but 14.1 stays "14.1".
function trim(x: number): string {
  const r = Math.round(x * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function formatPercent(fraction: number | null, decimals = 1): string {
  if (fraction === null || !Number.isFinite(fraction)) return UNAVAILABLE;
  return `${(fraction * 100).toFixed(decimals)}%`;
}

export function formatSignedPercent(fraction: number | null, decimals = 1): string {
  if (fraction === null || !Number.isFinite(fraction)) return UNAVAILABLE;
  const pct = (fraction * 100).toFixed(decimals);
  if (fraction < 0) return `−${pct.replace("-", "")}%`; // U+2212 minus
  return `+${pct}%`;
}

export function formatUSD2(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return UNAVAILABLE;
  return `$${n.toFixed(2)}`;
}

export function receiptNumber(company: string, fiscalYear: number): string {
  const seed = `${company.trim().toLowerCase()}|${fiscalYear}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return String(h % 10000).padStart(4, "0");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/format.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/format.ts lib/format.test.ts
git commit -m "feat: add number and receipt-number formatting"
```

---

### Task 3: Ratio math (pure functions)

**Files:**
- Create: `lib/math.ts`
- Test: `lib/math.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `shareOfFederal(contracts: number | null, total: number | null): number | null` — `contracts/total`.
  - `federallyFed(contracts: number | null, revenue: number | null): number | null` — `contracts/revenue`.
  - `perHundred(share: number | null): number | null` — `share * 100`.
  - `perDollar(fed: number | null): number | null` — passthrough of `federallyFed` (the "$ per $1" value).
  - All return `null` if any input is null/zero-denominator/non-finite.

- [ ] **Step 1: Write the failing test**

`lib/math.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { shareOfFederal, federallyFed, perHundred, perDollar } from "./math";

describe("shareOfFederal", () => {
  it("divides contracts by total", () => {
    expect(shareOfFederal(14.1e9, 401e9)!).toBeCloseTo(0.03516, 5);
  });
  it("returns null on null or zero denominator", () => {
    expect(shareOfFederal(null, 401e9)).toBeNull();
    expect(shareOfFederal(14e9, 0)).toBeNull();
    expect(shareOfFederal(14e9, null)).toBeNull();
  });
});

describe("federallyFed", () => {
  it("divides contracts by revenue", () => {
    expect(federallyFed(14.1e9, 71e9)!).toBeCloseTo(0.19859, 5);
  });
  it("returns null when revenue missing", () => {
    expect(federallyFed(14e9, null)).toBeNull();
  });
});

describe("perHundred / perDollar", () => {
  it("scales share by 100 and passes fed through", () => {
    expect(perHundred(0.0351)!).toBeCloseTo(3.51, 5);
    expect(perDollar(0.198)!).toBeCloseTo(0.198, 5);
    expect(perHundred(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/math.test.ts`
Expected: FAIL — cannot find module `./math`.

- [ ] **Step 3: Write the implementation**

`lib/math.ts`:
```ts
function safeDivide(num: number | null, den: number | null): number | null {
  if (num === null || den === null) return null;
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return null;
  return num / den;
}

export function shareOfFederal(contracts: number | null, total: number | null): number | null {
  return safeDivide(contracts, total);
}

export function federallyFed(contracts: number | null, revenue: number | null): number | null {
  return safeDivide(contracts, revenue);
}

export function perHundred(share: number | null): number | null {
  return share === null ? null : share * 100;
}

export function perDollar(fed: number | null): number | null {
  return fed;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/math.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/math.ts lib/math.test.ts
git commit -m "feat: add federal-diet ratio math"
```

---

### Task 4: Tako client interface + HTTP implementation + fake

**Files:**
- Create: `lib/tako/types.ts`, `lib/tako/client.ts`, `lib/tako/fake.ts`
- Test: `lib/tako/client.test.ts`

**Interfaces:**
- Consumes: `TAKO_BASE_URL` from `lib/constants.ts`.
- Produces:
  - `interface TakoSearchResult { value: number | null; embedUrl: string | null; matched: string | null; candidates: Candidate[]; }`
  - `interface Candidate { name: string; entityId: string; }`
  - `interface TakoClient { searchValue(query: string): Promise<TakoSearchResult>; answer(query: string, sources?: ("tako"|"web")[]): Promise<string | null>; }`
  - `class HttpTakoClient implements TakoClient` — constructed with `(apiKey: string, baseUrl?: string, fetchImpl?: typeof fetch)`.
  - `parseSearchResponse(json: unknown): TakoSearchResult` — exported pure parser (the single verification point for Tako's wire format).
  - `class FakeTakoClient implements TakoClient` — constructed with a script of canned answers, for all other tasks' tests.

> **VERIFY-AGAINST-LIVE:** `parseSearchResponse` below maps a *documented-shape assumption* of Tako's `/api/v3/search/` response (top card → first numeric value + `embed_url`; multiple entity matches → `candidates`). Before relying on live data, run one real query, inspect the JSON, and adjust ONLY this function and `answer`'s parsing. Nothing else in the codebase touches Tako's wire format.

- [ ] **Step 1: Write the failing test**

`lib/tako/client.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { HttpTakoClient, parseSearchResponse } from "./client";

describe("parseSearchResponse", () => {
  it("extracts the top numeric value and embed url", () => {
    const json = {
      outputs: {
        knowledge_cards: [
          {
            embed_url: "https://trytako.com/embed/abc",
            title: "Lockheed Martin federal obligations",
            entity: { name: "Lockheed Martin", id: "v-123" },
            time_series: [{ value: 14_100_000_000 }],
          },
        ],
      },
    };
    const r = parseSearchResponse(json);
    expect(r.value).toBe(14_100_000_000);
    expect(r.embedUrl).toBe("https://trytako.com/embed/abc");
    expect(r.matched).toBe("Lockheed Martin");
    expect(r.candidates).toEqual([{ name: "Lockheed Martin", entityId: "v-123" }]);
  });

  it("returns nulls and empty candidates when no cards", () => {
    const r = parseSearchResponse({ outputs: { knowledge_cards: [] } });
    expect(r.value).toBeNull();
    expect(r.embedUrl).toBeNull();
    expect(r.candidates).toEqual([]);
  });

  it("collects multiple candidates for disambiguation", () => {
    const json = {
      outputs: {
        knowledge_cards: [
          { entity: { name: "Apple Inc.", id: "c-1" }, time_series: [{ value: 1 }] },
          { entity: { name: "Apple Hospitality", id: "c-2" }, time_series: [{ value: 2 }] },
        ],
      },
    };
    expect(parseSearchResponse(json).candidates).toHaveLength(2);
  });
});

describe("HttpTakoClient", () => {
  it("sends the api key and query, returns parsed value", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          outputs: { knowledge_cards: [{ embed_url: "u", time_series: [{ value: 42 }] }] },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new HttpTakoClient("secret-key", "https://trytako.com/api/v3", fetchMock as unknown as typeof fetch);
    const r = await client.searchValue("test query");
    expect(r.value).toBe(42);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://trytako.com/api/v3/search/");
    expect((init as RequestInit).method).toBe("POST");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe("secret-key");
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({ query: "test query", effort: "fast" });
  });

  it("returns null value on non-200", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("nope", { status: 402 }));
    const client = new HttpTakoClient("k", "https://trytako.com/api/v3", fetchMock as unknown as typeof fetch);
    const r = await client.searchValue("q");
    expect(r.value).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/tako/client.test.ts`
Expected: FAIL — cannot find module `./client`.

- [ ] **Step 3: Write the types**

`lib/tako/types.ts`:
```ts
export interface Candidate {
  name: string;
  entityId: string;
}

export interface TakoSearchResult {
  value: number | null;
  embedUrl: string | null;
  matched: string | null;
  candidates: Candidate[];
}

export type TakoSource = "tako" | "web";

export interface TakoClient {
  searchValue(query: string): Promise<TakoSearchResult>;
  answer(query: string, sources?: TakoSource[]): Promise<string | null>;
}
```

- [ ] **Step 4: Write the HTTP client + parser**

`lib/tako/client.ts`:
```ts
import { TAKO_BASE_URL } from "@/lib/constants";
import type { Candidate, TakoClient, TakoSearchResult, TakoSource } from "./types";

interface RawCard {
  embed_url?: string;
  entity?: { name?: string; id?: string };
  time_series?: Array<{ value?: number }>;
}

export function parseSearchResponse(json: unknown): TakoSearchResult {
  const cards = (json as { outputs?: { knowledge_cards?: RawCard[] } })?.outputs?.knowledge_cards ?? [];
  const candidates: Candidate[] = cards
    .filter((c) => c.entity?.name)
    .map((c) => ({ name: c.entity!.name as string, entityId: c.entity?.id ?? "" }));

  const top = cards[0];
  const series = top?.time_series ?? [];
  const last = series.length > 0 ? series[series.length - 1].value : undefined;

  return {
    value: typeof last === "number" && Number.isFinite(last) ? last : null,
    embedUrl: top?.embed_url ?? null,
    matched: top?.entity?.name ?? null,
    candidates,
  };
}

export function parseAnswerResponse(json: unknown): string | null {
  const text = (json as { answer?: string; text?: string })?.answer
    ?? (json as { text?: string })?.text
    ?? null;
  return typeof text === "string" && text.trim().length > 0 ? text.trim() : null;
}

export class HttpTakoClient implements TakoClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = TAKO_BASE_URL,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private headers(): Record<string, string> {
    return { "Content-Type": "application/json", "X-API-Key": this.apiKey };
  }

  async searchValue(query: string): Promise<TakoSearchResult> {
    const empty: TakoSearchResult = { value: null, embedUrl: null, matched: null, candidates: [] };
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/search/`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ query, effort: "fast" }),
      });
      if (!res.ok) return empty;
      return parseSearchResponse(await res.json());
    } catch {
      return empty;
    }
  }

  async answer(query: string, sources: TakoSource[] = ["tako", "web"]): Promise<string | null> {
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/answer/`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ query, sources }),
      });
      if (!res.ok) return null;
      return parseAnswerResponse(await res.json());
    } catch {
      return null;
    }
  }
}
```

- [ ] **Step 5: Write the fake client (used by later tasks)**

`lib/tako/fake.ts`:
```ts
import type { TakoClient, TakoSearchResult } from "./types";

export interface FakeScript {
  // keyed by substring matched (case-insensitive) against the query
  searches?: Array<{ match: string; result: Partial<TakoSearchResult> }>;
  answer?: string | null;
}

const EMPTY: TakoSearchResult = { value: null, embedUrl: null, matched: null, candidates: [] };

export class FakeTakoClient implements TakoClient {
  constructor(private readonly script: FakeScript) {}

  async searchValue(query: string): Promise<TakoSearchResult> {
    const q = query.toLowerCase();
    const hit = (this.script.searches ?? []).find((s) => q.includes(s.match.toLowerCase()));
    return hit ? { ...EMPTY, ...hit.result } : EMPTY;
  }

  async answer(): Promise<string | null> {
    return this.script.answer ?? null;
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- lib/tako/client.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/tako
git commit -m "feat: add Tako client interface, HTTP impl, and fake"
```

---

### Task 5: Receipt assembler (orchestration + branching)

**Files:**
- Create: `lib/receipt/types.ts`, `lib/receipt/build.ts`
- Test: `lib/receipt/build.test.ts`

**Interfaces:**
- Consumes: `TakoClient`, `Candidate` (Task 4); `shareOfFederal/federallyFed/perHundred/perDollar` (Task 3); `receiptNumber` (Task 2); `FISCAL_YEAR` (Task 1).
- Produces:
  - `type ReceiptStatus = "result" | "no-contracts" | "disambiguation" | "error";`
  - `interface ReceiptData { ... }` (full shape below).
  - `async function buildReceipt(company: string, client: TakoClient, fiscalYear?: number): Promise<ReceiptData>`.
  - Query strings are centralized as exported functions so tests and the verifier agree on phrasing.

- [ ] **Step 1: Write the receipt types**

`lib/receipt/types.ts`:
```ts
import type { Candidate } from "@/lib/tako/types";

export type ReceiptStatus = "result" | "no-contracts" | "disambiguation" | "error";

export interface ReceiptData {
  status: ReceiptStatus;
  company: string;
  fiscalYear: number;
  receiptNo: string;
  isPrivate: boolean;

  contracts: number | null;
  totalFederalContracts: number | null;
  revenue: number | null;
  netIncome: number | null;
  stockChange1y: number | null;
  rank: number | null;

  shareOfFederal: number | null;
  federallyFed: number | null;
  perHundred: number | null;
  perDollar: number | null;

  explanation: string | null;
  takoEmbedUrl: string | null;

  candidates: Candidate[];
  error: string | null;
}
```

- [ ] **Step 2: Write the failing test**

`lib/receipt/build.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildReceipt } from "./build";
import { FakeTakoClient } from "@/lib/tako/fake";

const fullScript = {
  searches: [
    { match: "lockheed martin federal contract", result: { value: 14.1e9, embedUrl: "https://trytako.com/embed/lm", matched: "Lockheed Martin", candidates: [{ name: "Lockheed Martin", entityId: "v1" }] } },
    { match: "total", result: { value: 401e9 } },
    { match: "revenue", result: { value: 71e9 } },
    { match: "net income", result: { value: 5.3e9 } },
    { match: "stock", result: { value: -0.04 } },
    { match: "rank", result: { value: 1 } },
  ],
  answer: "Mainly DoD aircraft, missile, and space programs.",
};

describe("buildReceipt", () => {
  it("assembles a full result with computed ratios", async () => {
    const r = await buildReceipt("Lockheed Martin", new FakeTakoClient(fullScript), 2025);
    expect(r.status).toBe("result");
    expect(r.contracts).toBe(14.1e9);
    expect(r.totalFederalContracts).toBe(401e9);
    expect(r.shareOfFederal!).toBeCloseTo(0.03516, 5);
    expect(r.federallyFed!).toBeCloseTo(0.19859, 5);
    expect(r.perHundred!).toBeCloseTo(3.516, 3);
    expect(r.isPrivate).toBe(false);
    expect(r.explanation).toContain("DoD");
    expect(r.takoEmbedUrl).toBe("https://trytako.com/embed/lm");
    expect(r.receiptNo).toMatch(/^\d{4}$/);
  });

  it("flags no-contracts when contract value is missing/zero", async () => {
    const r = await buildReceipt("Ben & Jerry's", new FakeTakoClient({ searches: [], answer: null }), 2025);
    expect(r.status).toBe("no-contracts");
    expect(r.federallyFed).toBeNull();
  });

  it("flags disambiguation when matches are ambiguous and no value resolved", async () => {
    const script = {
      searches: [
        { match: "apple federal contract", result: { value: null, candidates: [
          { name: "Apple Inc.", entityId: "c1" },
          { name: "Apple Hospitality REIT", entityId: "c2" },
        ] } },
      ],
    };
    const r = await buildReceipt("Apple", new FakeTakoClient(script), 2025);
    expect(r.status).toBe("disambiguation");
    expect(r.candidates).toHaveLength(2);
  });

  it("marks private companies (contracts but no revenue) and skips the stamp value", async () => {
    const script = {
      searches: [
        { match: "palantir federal contract", result: { value: 1.2e9, matched: "Palantir", candidates: [{ name: "Palantir", entityId: "v9" }] } },
        { match: "total", result: { value: 401e9 } },
        // no revenue card
      ],
      answer: "Data analytics for defense and civilian agencies.",
    };
    const r = await buildReceipt("SecretCorp", new FakeTakoClient(script), 2025);
    expect(r.status).toBe("result");
    expect(r.isPrivate).toBe(true);
    expect(r.federallyFed).toBeNull();
    expect(r.shareOfFederal).not.toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- lib/receipt/build.test.ts`
Expected: FAIL — cannot find module `./build`.

- [ ] **Step 4: Write the assembler**

`lib/receipt/build.ts`:
```ts
import { FISCAL_YEAR } from "@/lib/constants";
import { receiptNumber } from "@/lib/format";
import { shareOfFederal, federallyFed, perHundred, perDollar } from "@/lib/math";
import type { TakoClient } from "@/lib/tako/types";
import type { ReceiptData } from "./types";

// Centralized query phrasing — tests and the live verifier must agree on these.
export const queries = {
  contracts: (c: string, fy: number) => `${c} federal contract obligations FY${fy}`,
  total: (fy: number) => `total US federal contract obligations FY${fy}`,
  revenue: (c: string) => `${c} annual revenue`,
  netIncome: (c: string) => `${c} net income`,
  stock: (c: string) => `${c} stock 1 year price change`,
  rank: (c: string, fy: number) => `${c} rank among federal contractors FY${fy}`,
  explanation: (c: string) => `What are ${c}'s US federal contracts mainly for?`,
};

export async function buildReceipt(
  company: string,
  client: TakoClient,
  fiscalYear: number = FISCAL_YEAR,
): Promise<ReceiptData> {
  const base: ReceiptData = {
    status: "result",
    company,
    fiscalYear,
    receiptNo: receiptNumber(company, fiscalYear),
    isPrivate: false,
    contracts: null,
    totalFederalContracts: null,
    revenue: null,
    netIncome: null,
    stockChange1y: null,
    rank: null,
    shareOfFederal: null,
    federallyFed: null,
    perHundred: null,
    perDollar: null,
    explanation: null,
    takoEmbedUrl: null,
    candidates: [],
    error: null,
  };

  try {
    const contractRes = await client.searchValue(queries.contracts(company, fiscalYear));
    base.candidates = contractRes.candidates;
    base.takoEmbedUrl = contractRes.embedUrl;
    const matchedName = contractRes.matched ?? company;

    // No contract value found.
    if (contractRes.value === null || contractRes.value === 0) {
      // Ambiguous: several candidate entities but nothing resolved.
      if (contractRes.candidates.length > 1) {
        return { ...base, status: "disambiguation" };
      }
      return { ...base, status: "no-contracts" };
    }

    // Resolve the remaining figures in parallel.
    const [total, revenue, netIncome, stock, rank, explanation] = await Promise.all([
      client.searchValue(queries.total(fiscalYear)),
      client.searchValue(queries.revenue(matchedName)),
      client.searchValue(queries.netIncome(matchedName)),
      client.searchValue(queries.stock(matchedName)),
      client.searchValue(queries.rank(matchedName, fiscalYear)),
      client.answer(queries.explanation(matchedName), ["tako", "web"]),
    ]);

    const contracts = contractRes.value;
    const share = shareOfFederal(contracts, total.value);
    const fed = federallyFed(contracts, revenue.value);

    return {
      ...base,
      company: matchedName,
      contracts,
      totalFederalContracts: total.value,
      revenue: revenue.value,
      netIncome: netIncome.value,
      stockChange1y: stock.value,
      rank: rank.value,
      shareOfFederal: share,
      federallyFed: fed,
      perHundred: perHundred(share),
      perDollar: perDollar(fed),
      explanation,
      isPrivate: revenue.value === null,
    };
  } catch (e) {
    return { ...base, status: "error", error: e instanceof Error ? e.message : "unknown error" };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- lib/receipt/build.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/receipt
git commit -m "feat: add receipt assembler with branching and ratio math"
```

---

### Task 6: Cache wrapper (in-memory + KV behind one interface)

**Files:**
- Create: `lib/cache.ts`
- Test: `lib/cache.test.ts`

**Interfaces:**
- Consumes: `CACHE_TTL_SECONDS` (Task 1); `ReceiptData` (Task 5).
- Produces:
  - `interface ReceiptCache { get(key: string): Promise<ReceiptData | null>; set(key: string, value: ReceiptData): Promise<void>; }`
  - `class MemoryCache implements ReceiptCache` (used by tests and local dev fallback).
  - `function cacheKey(company: string, fiscalYear: number): string`.
  - `function getCache(): ReceiptCache` — returns a KV-backed cache when `KV_REST_API_URL` is set, else `MemoryCache`.

- [ ] **Step 1: Write the failing test**

`lib/cache.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { MemoryCache, cacheKey } from "./cache";
import type { ReceiptData } from "@/lib/receipt/types";

function sample(company: string): ReceiptData {
  return {
    status: "result", company, fiscalYear: 2025, receiptNo: "0001", isPrivate: false,
    contracts: 1, totalFederalContracts: 2, revenue: 3, netIncome: 4, stockChange1y: 0.1,
    rank: 1, shareOfFederal: 0.5, federallyFed: 0.3, perHundred: 50, perDollar: 0.3,
    explanation: null, takoEmbedUrl: null, candidates: [], error: null,
  };
}

describe("cacheKey", () => {
  it("normalizes name and includes the year", () => {
    expect(cacheKey("  Lockheed   Martin ", 2025)).toBe("receipt:lockheed martin:2025");
  });
});

describe("MemoryCache", () => {
  it("returns null on miss and stores on set", async () => {
    const c = new MemoryCache();
    expect(await c.get("k")).toBeNull();
    await c.set("k", sample("Lockheed Martin"));
    expect((await c.get("k"))!.company).toBe("Lockheed Martin");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/cache.test.ts`
Expected: FAIL — cannot find module `./cache`.

- [ ] **Step 3: Write the implementation**

`lib/cache.ts`:
```ts
import { CACHE_TTL_SECONDS } from "@/lib/constants";
import type { ReceiptData } from "@/lib/receipt/types";

export interface ReceiptCache {
  get(key: string): Promise<ReceiptData | null>;
  set(key: string, value: ReceiptData): Promise<void>;
}

export function cacheKey(company: string, fiscalYear: number): string {
  const normalized = company.trim().toLowerCase().replace(/\s+/g, " ");
  return `receipt:${normalized}:${fiscalYear}`;
}

export class MemoryCache implements ReceiptCache {
  private store = new Map<string, ReceiptData>();
  async get(key: string): Promise<ReceiptData | null> {
    return this.store.get(key) ?? null;
  }
  async set(key: string, value: ReceiptData): Promise<void> {
    this.store.set(key, value);
  }
}

class KvCache implements ReceiptCache {
  // Imported lazily so local/test runs don't require @vercel/kv env wiring.
  async get(key: string): Promise<ReceiptData | null> {
    const { kv } = await import("@vercel/kv");
    return (await kv.get<ReceiptData>(key)) ?? null;
  }
  async set(key: string, value: ReceiptData): Promise<void> {
    const { kv } = await import("@vercel/kv");
    await kv.set(key, value, { ex: CACHE_TTL_SECONDS });
  }
}

let singleton: ReceiptCache | null = null;
export function getCache(): ReceiptCache {
  if (singleton) return singleton;
  singleton = process.env.KV_REST_API_URL ? new KvCache() : new MemoryCache();
  return singleton;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/cache.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/cache.ts lib/cache.test.ts
git commit -m "feat: add receipt cache (memory + Vercel KV)"
```

---

### Task 7: `/api/receipt` route (cache + assembler + seed)

**Files:**
- Create: `lib/seed.ts`, `app/api/receipt/route.ts`
- Test: `lib/seed.test.ts`, `app/api/receipt/route.test.ts`

**Interfaces:**
- Consumes: `getCache`, `cacheKey` (Task 6); `buildReceipt` (Task 5); `HttpTakoClient` (Task 4); `FISCAL_YEAR` (Task 1).
- Produces:
  - `lib/seed.ts`: `LOCKHEED_SEED: ReceiptData` and `getSeed(company: string): ReceiptData | null` (case-insensitive on "lockheed").
  - `GET /api/receipt?company=<name>` → JSON `ReceiptData`. Validates input; missing/blank company → 400 `{ error }`. On cache miss with no `TAKO_API_KEY`, falls back to seed if available, else returns an `error` receipt (never throws, never fabricates).
  - `export const runtime = "nodejs"`.

- [ ] **Step 1: Write the failing test for the seed**

`lib/seed.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { LOCKHEED_SEED, getSeed } from "./seed";

describe("seed", () => {
  it("has a fully-formed Lockheed receipt", () => {
    expect(LOCKHEED_SEED.status).toBe("result");
    expect(LOCKHEED_SEED.company).toMatch(/Lockheed/);
    expect(LOCKHEED_SEED.contracts).toBeGreaterThan(0);
    expect(LOCKHEED_SEED.federallyFed).not.toBeNull();
  });
  it("matches lockheed case-insensitively", () => {
    expect(getSeed("lockheed martin")).not.toBeNull();
    expect(getSeed("Boeing")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/seed.test.ts`
Expected: FAIL — cannot find module `./seed`.

- [ ] **Step 3: Write the seed**

`lib/seed.ts` (figures from the build brief; clearly marked as a fallback so the page is never empty before the Tako account is funded):
```ts
import { receiptNumber } from "@/lib/format";
import { shareOfFederal, federallyFed, perHundred, perDollar } from "@/lib/math";
import type { ReceiptData } from "@/lib/receipt/types";

const contracts = 14.1e9;
const total = 401e9;
const revenue = 71e9;
const share = shareOfFederal(contracts, total);
const fed = federallyFed(contracts, revenue);

export const LOCKHEED_SEED: ReceiptData = {
  status: "result",
  company: "Lockheed Martin",
  fiscalYear: 2025,
  receiptNo: receiptNumber("Lockheed Martin", 2025),
  isPrivate: false,
  contracts,
  totalFederalContracts: total,
  revenue,
  netIncome: 5.3e9,
  stockChange1y: -0.04,
  rank: 1,
  shareOfFederal: share,
  federallyFed: fed,
  perHundred: perHundred(share),
  perDollar: perDollar(fed),
  explanation: "Mainly U.S. Department of Defense aircraft, missile, and space programs.",
  takoEmbedUrl: "https://trytako.com",
  candidates: [],
  error: null,
};

export function getSeed(company: string): ReceiptData | null {
  return company.trim().toLowerCase().includes("lockheed") ? LOCKHEED_SEED : null;
}
```

- [ ] **Step 4: Write the failing test for the route**

`app/api/receipt/route.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

// Force the seed/no-key path (no TAKO_API_KEY, no KV).
beforeEach(() => {
  vi.resetModules();
  delete process.env.TAKO_API_KEY;
  delete process.env.KV_REST_API_URL;
});

async function call(url: string) {
  const { GET } = await import("./route");
  return GET(new Request(url));
}

describe("GET /api/receipt", () => {
  it("400s on blank company", async () => {
    const res = await call("http://localhost/api/receipt?company=");
    expect(res.status).toBe(400);
  });

  it("returns the Lockheed seed when no API key is configured", async () => {
    const res = await call("http://localhost/api/receipt?company=Lockheed%20Martin");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.company).toBe("Lockheed Martin");
    expect(body.status).toBe("result");
  });

  it("returns an error receipt (not a throw) for unknown company with no key", async () => {
    const res = await call("http://localhost/api/receipt?company=Boeing");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("error");
  });
});
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npm test -- lib/seed.test.ts app/api/receipt/route.test.ts`
Expected: seed FAIL then (after Step 3) route FAIL — cannot find module `./route`.

- [ ] **Step 6: Write the route**

`app/api/receipt/route.ts`:
```ts
import { FISCAL_YEAR } from "@/lib/constants";
import { getCache, cacheKey } from "@/lib/cache";
import { buildReceipt } from "@/lib/receipt/build";
import type { ReceiptData } from "@/lib/receipt/types";
import { HttpTakoClient } from "@/lib/tako/client";
import { getSeed } from "@/lib/seed";

export const runtime = "nodejs";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorReceipt(company: string, message: string): ReceiptData {
  return {
    status: "error", company, fiscalYear: FISCAL_YEAR, receiptNo: "0000", isPrivate: false,
    contracts: null, totalFederalContracts: null, revenue: null, netIncome: null,
    stockChange1y: null, rank: null, shareOfFederal: null, federallyFed: null,
    perHundred: null, perDollar: null, explanation: null, takoEmbedUrl: null,
    candidates: [], error: message,
  };
}

export async function GET(req: Request): Promise<Response> {
  const company = new URL(req.url).searchParams.get("company")?.trim() ?? "";
  if (!company) return json({ error: "company is required" }, 400);

  const cache = getCache();
  const key = cacheKey(company, FISCAL_YEAR);

  const cached = await cache.get(key);
  if (cached) return json(cached);

  const apiKey = process.env.TAKO_API_KEY;
  if (!apiKey) {
    const seed = getSeed(company);
    if (seed) {
      await cache.set(key, seed);
      return json(seed);
    }
    return json(errorReceipt(company, "Tako API key not configured"));
  }

  const client = new HttpTakoClient(apiKey);
  const receipt = await buildReceipt(company, client, FISCAL_YEAR);

  // Only cache successful, resolvable receipts — not transient errors.
  if (receipt.status === "result" || receipt.status === "no-contracts") {
    await cache.set(key, receipt);
  }
  return json(receipt);
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- lib/seed.test.ts app/api/receipt/route.test.ts`
Expected: PASS (all).

- [ ] **Step 8: Commit**

```bash
git add lib/seed.ts lib/seed.test.ts app/api/receipt
git commit -m "feat: add /api/receipt route with cache, seed, and Tako wiring"
```

---

### Task 8: Receipt card sub-components (Stamp, LedgerLine, StatColumn)

**Files:**
- Create: `components/Stamp.tsx`, `components/LedgerLine.tsx`, `components/StatColumn.tsx`
- Create: `components/receipt.module.css`
- Test: `components/Stamp.test.tsx`, `components/LedgerLine.test.tsx`

**Interfaces:**
- Consumes: `formatSignedPercent`, `formatCompactUSD` indirectly via props (components take pre-formatted strings or raw + formatter — here they take display strings to stay dumb).
- Produces:
  - `Stamp({ percentLabel }: { percentLabel: string })` — diagonal red "FEDERALLY FED" stamp; renders nothing if `percentLabel` is empty.
  - `LedgerLine({ label, value }: { label: string; value: string })` — dotted-leader row.
  - `StatColumn({ title, rows }: { title: string; rows: Array<{ label: string; value: string; tone?: "up" | "down" }> })`.

- [ ] **Step 1: Write the failing tests**

`components/Stamp.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Stamp } from "./Stamp";

describe("Stamp", () => {
  it("shows the percent and FEDERALLY FED label", () => {
    render(<Stamp percentLabel="36.8%" />);
    expect(screen.getByText("36.8%")).toBeInTheDocument();
    expect(screen.getByText("FEDERALLY FED")).toBeInTheDocument();
  });
  it("renders nothing when no percent (private company)", () => {
    const { container } = render(<Stamp percentLabel="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

`components/LedgerLine.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LedgerLine } from "./LedgerLine";

describe("LedgerLine", () => {
  it("renders label and value", () => {
    render(<LedgerLine label="Of every $100 of federal spend" value="$3.52" />);
    expect(screen.getByText(/Of every \$100/)).toBeInTheDocument();
    expect(screen.getByText("$3.52")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- components/Stamp.test.tsx components/LedgerLine.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the CSS module**

`components/receipt.module.css`:
```css
.stamp {
  position: absolute;
  top: 150px;
  right: 18px;
  transform: rotate(-14deg);
  border: 3px solid var(--stamp-red);
  border-radius: 8px;
  color: var(--stamp-red);
  padding: 6px 14px;
  text-align: center;
  font-family: var(--font-mono);
  text-transform: uppercase;
  opacity: 0.92;
  mix-blend-mode: multiply;
  pointer-events: none;
}
.stampPct { font-size: 30px; font-weight: 800; line-height: 1; }
.stampLabel { font-size: 11px; letter-spacing: 2px; margin-top: 4px; }

.ledger {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 13px;
  margin: 6px 0;
}
.ledger .leader {
  flex: 1;
  border-bottom: 1px dotted color-mix(in srgb, var(--ink) 45%, transparent);
  transform: translateY(-4px);
}
.ledger .value { color: var(--money-green); font-weight: 700; }

.col { flex: 1; }
.colTitle {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 1px;
  text-transform: uppercase;
  border-bottom: 1px solid var(--ink);
  padding-bottom: 4px;
  margin-bottom: 8px;
}
.statRow { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 13px; margin: 5px 0; }
.statLabel { opacity: 0.7; }
.up { color: var(--money-green); }
.down { color: var(--stamp-red); }
```

- [ ] **Step 4: Write the components**

`components/Stamp.tsx`:
```tsx
import styles from "./receipt.module.css";

export function Stamp({ percentLabel }: { percentLabel: string }) {
  if (!percentLabel) return null;
  return (
    <div className={styles.stamp} aria-label={`Federally fed: ${percentLabel}`}>
      <div className={styles.stampPct}>{percentLabel}</div>
      <div className={styles.stampLabel}>Federally Fed</div>
    </div>
  );
}
```

`components/LedgerLine.tsx`:
```tsx
import styles from "./receipt.module.css";

export function LedgerLine({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.ledger}>
      <span>{label}</span>
      <span className={styles.leader} aria-hidden />
      <span className={styles.value}>{value}</span>
    </div>
  );
}
```

`components/StatColumn.tsx`:
```tsx
import styles from "./receipt.module.css";

export interface StatRow {
  label: string;
  value: string;
  tone?: "up" | "down";
}

export function StatColumn({ title, rows }: { title: string; rows: StatRow[] }) {
  return (
    <div className={styles.col}>
      <div className={styles.colTitle}>{title}</div>
      {rows.map((r) => (
        <div key={r.label} className={styles.statRow}>
          <span className={styles.statLabel}>{r.label}</span>
          <span className={r.tone ? styles[r.tone] : undefined}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- components/Stamp.test.tsx components/LedgerLine.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/Stamp.tsx components/LedgerLine.tsx components/StatColumn.tsx components/receipt.module.css
git commit -m "feat: add receipt sub-components (stamp, ledger line, stat column)"
```

---

### Task 9: Receipt card (assembles the full card from ReceiptData)

**Files:**
- Create: `components/Receipt.tsx`
- Test: `components/Receipt.test.tsx`

**Interfaces:**
- Consumes: `ReceiptData` (Task 5); `Stamp`, `LedgerLine`, `StatColumn` (Task 8); all formatters (Task 2).
- Produces: `Receipt({ data }: { data: ReceiptData })` — renders the full card for `status === "result"` (incl. private variant), and the celebratory variant for `status === "no-contracts"`. (Disambiguation/error are handled by the page, not the card.)

- [ ] **Step 1: Write the failing test**

`components/Receipt.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Receipt } from "./Receipt";
import { LOCKHEED_SEED } from "@/lib/seed";

describe("Receipt", () => {
  it("renders the company, hero contract figure, eyebrow and stamp", () => {
    render(<Receipt data={LOCKHEED_SEED} />);
    expect(screen.getByText("Lockheed Martin")).toBeInTheDocument();
    expect(screen.getByText("$14.1B")).toBeInTheDocument();
    expect(screen.getByText(/On the federal diet/i)).toBeInTheDocument();
    expect(screen.getByText("FEDERALLY FED")).toBeInTheDocument();
    expect(screen.getByText(/FY2025/)).toBeInTheDocument();
    expect(screen.getByText(/figures = obligations/i)).toBeInTheDocument();
  });

  it("hides the stamp for private companies", () => {
    render(<Receipt data={{ ...LOCKHEED_SEED, isPrivate: true, revenue: null, federallyFed: null, perDollar: null }} />);
    expect(screen.queryByText("FEDERALLY FED")).not.toBeInTheDocument();
  });

  it("renders the celebratory no-contracts variant", () => {
    render(<Receipt data={{ ...LOCKHEED_SEED, status: "no-contracts" }} />);
    expect(screen.getByText(/Good news/i)).toBeInTheDocument();
    expect(screen.getByText(/isn't on the federal diet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/Receipt.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the Receipt card**

`components/Receipt.tsx`:
```tsx
import styles from "./receipt.module.css";
import { Stamp } from "./Stamp";
import { LedgerLine } from "./LedgerLine";
import { StatColumn } from "./StatColumn";
import {
  formatCompactUSD,
  formatPercent,
  formatSignedPercent,
  formatUSD2,
} from "@/lib/format";
import type { ReceiptData } from "@/lib/receipt/types";

export function Receipt({ data }: { data: ReceiptData }) {
  const eyebrow = `THE FEDERAL DIET · RECEIPT · FY${data.fiscalYear} · NO.${data.receiptNo}`;

  if (data.status === "no-contracts") {
    return (
      <article className={styles.card} data-testid="receipt">
        <div className={styles.eyebrow}>{eyebrow}</div>
        <div className={styles.preheadline}>On the federal diet</div>
        <h1 className={styles.company}>{data.company}</h1>
        <p className={styles.goodNews}>
          Good news — {data.company} isn&apos;t on the federal diet.
        </p>
        <p className={styles.note}>No federal contract obligations found for FY{data.fiscalYear}.</p>
        <Footer data={data} />
      </article>
    );
  }

  const stampLabel = data.isPrivate ? "" : formatPercent(data.federallyFed);

  return (
    <article className={styles.card} data-testid="receipt">
      <div className={styles.eyebrow}>{eyebrow}</div>
      <div className={styles.preheadline}>On the federal diet</div>
      <h1 className={styles.company}>{data.company}</h1>

      <div className={styles.hero}>
        <span className={styles.heroNum}>{formatCompactUSD(data.contracts)}</span>
        <span className={styles.heroLabel}>consumed in fed. contracts</span>
      </div>

      <Stamp percentLabel={stampLabel} />

      <div className={styles.columns}>
        <StatColumn
          title="Federal Contracts"
          rows={[
            { label: "Contracts", value: formatCompactUSD(data.contracts) },
            { label: "Rank", value: data.rank ? `#${data.rank}` : "data unavailable" },
            { label: "Share of all fed.", value: formatPercent(data.shareOfFederal) },
          ]}
        />
        <StatColumn
          title="Company Health"
          rows={[
            { label: "Revenue", value: formatCompactUSD(data.revenue) },
            { label: "Net income", value: formatCompactUSD(data.netIncome) },
            {
              label: "Stock 1-yr",
              value: formatSignedPercent(data.stockChange1y),
              tone: data.stockChange1y === null ? undefined : data.stockChange1y >= 0 ? "up" : "down",
            },
          ]}
        />
      </div>

      <div className={styles.ledgerBlock}>
        <LedgerLine
          label={`Of every $100 in federal contract spending, this much went to ${data.company}`}
          value={formatUSD2(data.perHundred)}
        />
        {!data.isPrivate && (
          <LedgerLine
            label={`Of every $1 of ${data.company} revenue, this much is federal`}
            value={formatUSD2(data.perDollar)}
          />
        )}
      </div>

      {data.explanation && <p className={styles.explanation}>{data.explanation}</p>}

      <Footer data={data} />
    </article>
  );
}

function Footer({ data }: { data: ReceiptData }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.barcode} aria-hidden />
      <p className={styles.sources}>
        Sources: U.S. Treasury / USASpending, S&amp;P Global, Xignite — via Tako. Figures = obligations.
      </p>
      {data.takoEmbedUrl && (
        <a className={styles.takoLink} href={data.takoEmbedUrl} target="_blank" rel="noreferrer">
          Open in Tako →
        </a>
      )}
    </footer>
  );
}
```

- [ ] **Step 4: Add the remaining card CSS**

Append to `components/receipt.module.css`:
```css
.card {
  position: relative;
  max-width: 560px;
  margin: 0 auto;
  background: var(--paper);
  color: var(--ink);
  padding: 28px 26px 22px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.18);
  background-image: repeating-linear-gradient(
    transparent, transparent 27px,
    color-mix(in srgb, var(--money-green) 8%, transparent) 28px
  );
}
.eyebrow { font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.5px; text-align: center; opacity: 0.7; }
.preheadline { font-family: var(--font-mono); font-variant: small-caps; text-transform: lowercase; letter-spacing: 2px; font-size: 13px; margin-top: 14px; }
.company { font-family: var(--font-display); font-size: 44px; line-height: 0.95; margin: 2px 0 14px; }
.hero { display: flex; flex-direction: column; }
.heroNum { font-family: var(--font-mono); font-size: 40px; font-weight: 800; color: var(--money-green); }
.heroLabel { font-family: var(--font-mono); font-size: 12px; opacity: 0.75; }
.columns { display: flex; gap: 18px; margin: 22px 0 8px; }
.ledgerBlock { margin: 14px 0; }
.explanation { font-family: var(--font-serif); font-style: italic; font-size: 15px; line-height: 1.45; margin: 14px 0; }
.goodNews { font-family: var(--font-display); font-size: 22px; color: var(--money-green); margin: 18px 0 6px; }
.note, .sources { font-family: var(--font-mono); font-size: 11px; opacity: 0.7; }
.footer { border-top: 1px dashed var(--ink); margin-top: 16px; padding-top: 10px; }
.barcode { height: 26px; margin-bottom: 8px; background: repeating-linear-gradient(90deg, var(--ink) 0 2px, transparent 2px 4px, var(--ink) 4px 5px, transparent 5px 9px); }
.takoLink { font-family: var(--font-mono); font-size: 12px; color: var(--money-green); display: inline-block; margin-top: 6px; }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- components/Receipt.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add components/Receipt.tsx components/Receipt.test.tsx components/receipt.module.css
git commit -m "feat: add the receipt card with private and no-contracts variants"
```

---

### Task 10: Page — search, state machine, deep link, PNG export, copy link

**Files:**
- Create: `app/page.tsx` (replace placeholder), `components/SearchBox.tsx`, `components/Disambiguation.tsx`, `app/globals.css`
- Modify: `app/layout.tsx` (wire fonts + globals + CSS vars)
- Test: `components/SearchBox.test.tsx`

**Interfaces:**
- Consumes: `Receipt` (Task 9); `ReceiptData`, `Candidate` (Task 5); `/api/receipt` (Task 7).
- Produces: a client page that fetches `/api/receipt?company=`, renders state machine (`idle/loading/result/no-contracts/disambiguation/error`), supports `?c=` deep link, default Lockheed load, "Save receipt" (PNG via `html-to-image`), and "Copy link".

- [ ] **Step 1: Write the failing test for SearchBox**

`components/SearchBox.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SearchBox } from "./SearchBox";

describe("SearchBox", () => {
  it("submits the typed company name", () => {
    const onSearch = vi.fn();
    render(<SearchBox onSearch={onSearch} loading={false} initial="" />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Boeing" } });
    fireEvent.click(screen.getByRole("button", { name: /generate receipt/i }));
    expect(onSearch).toHaveBeenCalledWith("Boeing");
  });

  it("disables the button while loading", () => {
    render(<SearchBox onSearch={() => {}} loading initial="" />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/SearchBox.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write SearchBox**

`components/SearchBox.tsx`:
```tsx
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
```

- [ ] **Step 4: Write Disambiguation**

`components/Disambiguation.tsx`:
```tsx
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
```

- [ ] **Step 5: Write the page**

`app/page.tsx`:
```tsx
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
```

- [ ] **Step 6: Wire fonts + globals in layout**

`app/layout.tsx`:
```tsx
import type { ReactNode } from "react";
import { Archivo_Black, JetBrains_Mono, Spectral } from "next/font/google";
import "./globals.css";

const display = Archivo_Black({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const serif = Spectral({ weight: ["400"], style: ["italic", "normal"], subsets: ["latin"], variable: "--font-serif" });

export const metadata = {
  title: "The Federal Diet",
  description: "A taxpayer receipt: how federally fed is your favorite company?",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

`app/globals.css`:
```css
:root {
  --paper: #F4F1E8;
  --ink: #1A1A17;
  --money-green: #1B4D3E;
  --stamp-red: #B0271F;
}
* { box-sizing: border-box; }
body { margin: 0; background: #e7e3d6; color: var(--ink); font-family: var(--font-mono), monospace; }
.page { max-width: 640px; margin: 0 auto; padding: 32px 16px 64px; }
.wordmark { font-family: var(--font-display); font-size: 30px; text-align: center; margin: 8px 0 0; }
.tagline { text-align: center; font-size: 13px; opacity: 0.75; margin: 4px 0 20px; }
.searchRow { display: flex; gap: 8px; margin-bottom: 20px; }
.searchRow input { flex: 1; padding: 12px; font-family: var(--font-mono); border: 1.5px solid var(--ink); background: var(--paper); }
.searchRow button, .shareRow button, .disambig button {
  padding: 12px 16px; font-family: var(--font-mono); background: var(--money-green); color: #fff; border: none; cursor: pointer;
}
.searchRow button:disabled { opacity: 0.6; cursor: progress; }
:focus-visible { outline: 3px solid var(--stamp-red); outline-offset: 2px; }
.status { text-align: center; font-size: 13px; }
.status.error { color: var(--stamp-red); }
.shareRow { display: flex; gap: 10px; justify-content: center; margin-top: 18px; }
.disambig ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; max-width: 560px; margin: 0 auto; }
.disambig button { width: 100%; background: var(--paper); color: var(--ink); border: 1.5px solid var(--ink); }
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- components/SearchBox.test.tsx`
Expected: PASS.

- [ ] **Step 8: Full suite + typecheck + build**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all tests PASS, no type errors, production build succeeds.

- [ ] **Step 9: Commit**

```bash
git add app components
git commit -m "feat: add page state machine, search, deep-link, PNG export, fonts"
```

---

### Task 11: Deploy config + README + verification checklist

**Files:**
- Create: `vercel.json`, `README.md`
- Test: manual (documented below).

**Interfaces:**
- Consumes: everything above.
- Produces: a deployable repo with documented env vars and a live-verification checklist for when the Tako account is funded.

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs"
}
```

- [ ] **Step 2: Write `README.md`**

````markdown
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
````

- [ ] **Step 3: Live-data verification checklist (run once the Tako account has credit)**

```markdown
- [ ] Set TAKO_API_KEY locally; run one real `/api/receipt?company=Lockheed%20Martin`.
- [ ] Inspect the raw Tako JSON; confirm parseSearchResponse extracts value/embed_url/candidates correctly. Adjust ONLY lib/tako/client.ts if the shape differs.
- [ ] Confirm contracts + total are the SAME fiscal year; confirm the year label on the card.
- [ ] Spot-check 3 companies: a public contractor (Boeing), a private/no-revenue case, and a no-contracts case (e.g. a consumer brand). Verify each renders the correct variant.
- [ ] Verify "Save receipt" PNG and "Copy link" deep-link round-trip.
```

- [ ] **Step 4: Final full verification**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: green across the board.

- [ ] **Step 5: Commit**

```bash
git add vercel.json README.md
git commit -m "chore: add deploy config, README, and live-verification checklist"
```

---

## Self-Review Notes

- **Spec coverage:** concept/tone (Task 9 copy + globals), separate Tako calls + ratios in code (Tasks 3–5), same-FY denominator (Task 5 `queries`, Task 11 checklist), secret server-side (Task 7), KV cache 24h (Tasks 1, 6, 7), all five layout regions + aesthetic + fonts (Tasks 8–10), all five edge states (Tasks 5, 7, 9, 10), graceful "data unavailable" (Task 2 + Task 9 rows), deterministic receipt no. (Task 2), PNG export + copy link + deep link (Task 10), default Lockheed load (Tasks 7, 10), testing 80%+ via pure-function + route + component tests, honesty note "figures = obligations" (Task 9 footer).
- **Verification boundary:** the only unverified Tako wire detail is isolated to `parseSearchResponse`/`parseAnswerResponse` (Task 4), with an explicit live-checklist in Task 11 — no fabricated numbers anywhere; missing data renders "data unavailable".
- **Type consistency:** `ReceiptData`, `TakoSearchResult`, `Candidate`, `ReceiptCache` names and signatures are used identically across tasks 4–10.
