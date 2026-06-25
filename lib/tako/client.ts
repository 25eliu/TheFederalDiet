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
