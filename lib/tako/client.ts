import { TAKO_SEARCH_URL, TAKO_ANSWER_URL, TAKO_DEBUG } from "@/lib/constants";
import type { Candidate, SeriesTimeline, TakoClient, TakoSearchResult, TakoSource } from "./types";

// --- Real Tako v3 search response shape (docs.tako.com/api-reference/search-v3) ---
// { cards: [ { card_id, title, description, embed_url, sources: [{source_name}],
//             content: { format: "csv"|"text", data: string|null } } ], ... }
//
// IMPORTANT (confirmed from live data): for chart cards the search response does NOT
// inline the numbers — `content.data` is null. The figures live in `description` as
// prose, e.g.:
//   "...latest value was $14.1B on Oct 1, 2025, down 62.1% since Oct 1, 2007, with a
//    maximum of $76.1B on Oct 1, 2019 and a minimum of $14.1B on Oct 1, 2025."
//   "...time series ... between Oct 1, 2007 and Oct 1, 2025."
// So we parse `description` first, and only fall back to `content.data` when present.

interface RawContent {
  format?: string;
  data?: string | null;
}
interface RawCard {
  card_id?: string;
  title?: string;
  description?: string;
  embed_url?: string;
  content?: RawContent;
}

// Pull the structured figures + timeline out of a chart card's prose description.
export function parseSeriesDescription(desc: string | undefined | null): {
  latest: number | null;
  timeline: SeriesTimeline | null;
} {
  if (!desc || typeof desc !== "string") return { latest: null, timeline: null };

  const MONEY = String.raw`-?\$?-?[\d,]+(?:\.\d+)?\s*(?:trillion|billion|million|thousand|t|tn|bn|b|mn|m|k)?`;
  const DATE = String.raw`[A-Za-z]+\.?\s+\d{1,2},?\s+(\d{4})`;
  const yearOf = (m: RegExpMatchArray | null, i: number) => (m ? parseInt(m[i], 10) : null);

  const latestM = desc.match(new RegExp(`latest value was\\s+(${MONEY})`, "i"));
  const latest = latestM ? parseMagnitude(latestM[1]) : null;

  const rangeM = desc.match(new RegExp(`between\\s+${DATE}\\s+and\\s+${DATE}`, "i"));
  const maxM = desc.match(new RegExp(`maximum of\\s+(${MONEY})\\s+on\\s+${DATE}`, "i"));

  const startYear = yearOf(rangeM, 1);
  const endYear = yearOf(rangeM, 2);
  const peak = maxM ? parseMagnitude(maxM[1]) : null;
  const peakYear = maxM ? parseInt(maxM[2], 10) : null;

  const hasTimeline = startYear || endYear || peak;
  const timeline: SeriesTimeline | null = hasTimeline
    ? { startYear, endYear, peak, peakYear }
    : null;

  return { latest, timeline };
}

function logTako(...args: unknown[]): void {
  if (TAKO_DEBUG) console.info("[tako]", ...args);
}

function cap(s: string, n = 2000): string {
  return s.length > n ? `${s.slice(0, n)}…(${s.length} chars)` : s;
}

// Parse a single magnitude token into a number of dollars.
// Handles: "$14.1B", "14.1 billion", "$14,100,000,000", "980M", "1.2T", "5.3 trillion".
export function parseMagnitude(token: string): number | null {
  if (!token) return null;
  const t = token.trim().toLowerCase().replace(/[$,]/g, "");
  const m = t.match(/^(-?\d+(?:\.\d+)?)\s*(t|tn|trillion|b|bn|billion|m|mn|million|k|thousand)?/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return null;
  const suffix = m[2] ?? "";
  const mult = suffix.startsWith("t")
    ? 1e12
    : suffix.startsWith("b")
      ? 1e9
      : suffix.startsWith("m")
        ? 1e6
        : suffix.startsWith("k") || suffix === "thousand"
          ? 1e3
          : 1;
  return n * mult;
}

// Pull a dollar figure out of a card's content (CSV or text).
// Returns the value plus the list of candidates considered, so the caller can log
// what was seen vs. what was chosen. CSV: takes the last numeric cell of the last
// data row (most-recent-period convention); falls back to the largest number found.
// Text: takes the last currency-looking token, else the largest.
export function extractValueFromContent(content: RawContent | undefined): {
  value: number | null;
  candidates: number[];
} {
  const data = content?.data;
  if (!data || typeof data !== "string") return { value: null, candidates: [] };

  const tokenRe = /\$?\s*-?\d[\d,]*(?:\.\d+)?\s*(?:trillion|billion|million|thousand|t|tn|bn|b|mn|m|k)?/gi;

  if ((content?.format ?? "").toLowerCase() === "csv") {
    const rows = data.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
    const dataRows = rows.length > 1 ? rows.slice(1) : rows; // drop header if present
    const allNums: number[] = [];
    let lastRowLastNum: number | null = null;
    for (const row of dataRows) {
      const cells = row.split(",");
      for (const cell of cells) {
        const v = parseMagnitude(cell);
        if (v !== null) {
          allNums.push(v);
          lastRowLastNum = v;
        }
      }
    }
    const value = lastRowLastNum ?? (allNums.length ? Math.max(...allNums) : null);
    return { value, candidates: allNums };
  }

  // text / unknown: prefer currency-marked tokens ($ or a magnitude word) so a bare
  // year like "FY2025" can't win over "$14.1 billion". Fall back to the largest number.
  const tokens = data.match(tokenRe) ?? [];
  const nums = tokens.map(parseMagnitude).filter((n): n is number => n !== null);
  const currencyTokens = tokens.filter((t) => /\$|trillion|billion|million|thousand|[\d\s](?:t|tn|bn|b|mn|m|k)\b/i.test(t));
  const currencyNums = currencyTokens.map(parseMagnitude).filter((n): n is number => n !== null);
  const value = currencyNums.length
    ? currencyNums[currencyNums.length - 1]
    : nums.length
      ? Math.max(...nums)
      : null;
  return { value, candidates: nums };
}

export function parseSearchResponse(json: unknown): TakoSearchResult {
  const cards = (json as { cards?: RawCard[] })?.cards ?? [];
  const top = cards[0];

  // Primary source: the prose `description`. Fallback: `content.data` (when present).
  const fromDesc = parseSeriesDescription(top?.description);
  const fromContent = extractValueFromContent(top?.content);
  const value = fromDesc.latest ?? fromContent.value;

  logTako(
    "parsed search:",
    `cards=${cards.length}`,
    `topTitle=${JSON.stringify(top?.title ?? null)}`,
    `value=${value}`,
    `timeline=${JSON.stringify(fromDesc.timeline)}`,
    `(content.data=${top?.content?.data == null ? "null" : "present"})`,
  );

  // The v3 shape does not expose alternative entities, so we don't synthesize
  // candidates from cards (each card is a metric, not a rival company) and we leave
  // matched null — the caller keeps using the user's original company name.
  const candidates: Candidate[] = [];

  return {
    value: typeof value === "number" && Number.isFinite(value) ? value : null,
    embedUrl: top?.embed_url ?? null,
    matched: null,
    candidates,
    timeline: fromDesc.timeline,
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
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private headers(): Record<string, string> {
    return { "Content-Type": "application/json", "X-API-Key": this.apiKey };
  }

  async searchValue(query: string): Promise<TakoSearchResult> {
    const empty: TakoSearchResult = { value: null, embedUrl: null, matched: null, candidates: [], timeline: null };
    try {
      logTako("search →", TAKO_SEARCH_URL, JSON.stringify({ query }));
      const res = await this.fetchImpl(TAKO_SEARCH_URL, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ query, effort: "fast" }),
      });
      const raw = await res.text();
      if (!res.ok) {
        // Non-2xx is the usual hidden cause of "no data" — surface it loudly.
        console.warn("[tako] search non-OK", res.status, cap(raw, 500), "query:", query);
        return empty;
      }
      logTako("search ← 200", `query="${query}"`, cap(raw));
      return parseSearchResponse(JSON.parse(raw));
    } catch (e) {
      console.warn("[tako] search threw", e instanceof Error ? e.message : e, "query:", query);
      return empty;
    }
  }

  async answer(query: string, sources: TakoSource[] = ["tako", "web"]): Promise<string | null> {
    try {
      // sources is an OBJECT for the API ({tako:{}, web:{}}), not an array.
      const sourcesObj = Object.fromEntries(sources.map((s) => [s, {}]));
      logTako("answer →", TAKO_ANSWER_URL, JSON.stringify({ query, sources: sourcesObj }));
      const res = await this.fetchImpl(TAKO_ANSWER_URL, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ query, effort: "fast", sources: sourcesObj }),
      });
      const raw = await res.text();
      if (!res.ok) {
        console.warn("[tako] answer non-OK", res.status, cap(raw, 500), "query:", query);
        return null;
      }
      logTako("answer ← 200", cap(raw, 600));
      return parseAnswerResponse(JSON.parse(raw));
    } catch (e) {
      console.warn("[tako] answer threw", e instanceof Error ? e.message : e, "query:", query);
      return null;
    }
  }
}
