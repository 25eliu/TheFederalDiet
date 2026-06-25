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
