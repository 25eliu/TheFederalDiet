export interface Candidate {
  name: string;
  entityId: string;
}

// Timeline metadata parsed from a Tako chart card's description, e.g.
// "...between Oct 1, 2007 and Oct 1, 2025 ... maximum of $76.1B on Oct 1, 2019".
export interface SeriesTimeline {
  startYear: number | null;
  endYear: number | null;
  peak: number | null;
  peakYear: number | null;
}

export interface TakoSearchResult {
  value: number | null;
  embedUrl: string | null;
  matched: string | null;
  candidates: Candidate[];
  timeline: SeriesTimeline | null;
}

export type TakoSource = "tako" | "web";

export interface TakoClient {
  searchValue(query: string): Promise<TakoSearchResult>;
  answer(query: string, sources?: TakoSource[]): Promise<string | null>;
}
