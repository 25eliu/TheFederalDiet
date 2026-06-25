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

// One point of a Tako chart card's underlying CSV series (from include_contents).
export interface SeriesPoint {
  date: string; // raw date string from the CSV, e.g. "2024-10-01"
  year: number; // calendar year parsed from the date
  value: number;
}

export interface TakoSearchResult {
  value: number | null;
  embedUrl: string | null;
  matched: string | null;
  candidates: Candidate[];
  timeline: SeriesTimeline | null;
  // Full annual series when contents were requested; empty otherwise.
  series: SeriesPoint[];
  // Raw top-card description (prose), so callers can parse figures the structured
  // fields don't capture (e.g. market cap from a stock card).
  description: string | null;
}

export type TakoSource = "tako" | "web";

export interface SearchOptions {
  includeContents?: boolean;
}

export interface TakoClient {
  searchValue(query: string, options?: SearchOptions): Promise<TakoSearchResult>;
  answer(query: string, sources?: TakoSource[]): Promise<string | null>;
}
