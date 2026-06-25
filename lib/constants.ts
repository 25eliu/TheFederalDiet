export const FISCAL_YEAR = 2025;

export const MONEY_GREEN = "#1B4D3E";
export const STAMP_RED = "#B0271F";
export const PAPER = "#F4F1E8";
export const INK = "#1A1A17";

// Tako REST endpoints. Search is v3, the answer endpoint is v1 (different version
// path — confirmed against docs.tako.com/api-reference). Trailing slashes are kept
// because the Django backend routes the slashed form (a POST to the unslashed path
// can 301 and drop the body). Both are env-overridable for the live verifier.
export const TAKO_SEARCH_URL = process.env.TAKO_SEARCH_URL ?? "https://tako.com/api/v3/search/";
export const TAKO_ANSWER_URL = process.env.TAKO_ANSWER_URL ?? "https://tako.com/api/v1/answer/";
export const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h

// Total US federal prime-contract dollars per fiscal year — the denominator for
// "share of all federal contract dollars". Sourced once a year from GAO / Fed-Spend
// (FY2025 ≈ $681.3B in prime contract obligations). Configured as a constant because
// a live Tako search for "total federal contract obligations" mis-matched a company
// literally named "Total SA". Update this map each fiscal year.
export const TOTAL_FEDERAL_CONTRACTS_BY_FY: Record<number, number> = {
  2023: 759e9,
  2024: 773e9,
  2025: 681.3e9,
};

// Returns the configured total for the given FY, falling back to the most recent
// configured year at or below it (else the latest configured year).
export function totalFederalContracts(fiscalYear: number): number | null {
  if (TOTAL_FEDERAL_CONTRACTS_BY_FY[fiscalYear] != null) {
    return TOTAL_FEDERAL_CONTRACTS_BY_FY[fiscalYear];
  }
  const years = Object.keys(TOTAL_FEDERAL_CONTRACTS_BY_FY).map(Number).sort((a, b) => a - b);
  if (years.length === 0) return null;
  const atOrBelow = years.filter((y) => y <= fiscalYear);
  // Use the most recent year at or below; if the FY predates all configured years,
  // fall back to the earliest configured year.
  const chosen = atOrBelow.length ? atOrBelow[atOrBelow.length - 1] : years[0];
  return TOTAL_FEDERAL_CONTRACTS_BY_FY[chosen];
}

// When set (default on outside production), the Tako client logs each request,
// response status, raw payload, and extracted value so the wire format is visible.
export const TAKO_DEBUG = process.env.TAKO_DEBUG !== "0";
