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
    const searches = this.script.searches ?? [];

    // Round 1: exact substring match (fast path).
    const exact = searches.find((s) => q.includes(s.match.toLowerCase()));
    if (exact) return { ...EMPTY, ...exact.result };

    // Round 2: strip the first word from multi-word match keys and retry.
    // This lets scripts key on "<company> <domain terms>" while still matching
    // queries whose company name differs (e.g. a "SecretCorp" query matching a
    // "palantir federal contract" entry because "federal contract" is shared).
    const fallback = searches.find((s) => {
      const words = s.match.toLowerCase().split(/\s+/);
      if (words.length < 2) return false;
      const suffix = words.slice(1).join(" ");
      return q.includes(suffix);
    });
    return fallback ? { ...EMPTY, ...fallback.result } : EMPTY;
  }

  async answer(): Promise<string | null> {
    return this.script.answer ?? null;
  }
}
