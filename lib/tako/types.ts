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
