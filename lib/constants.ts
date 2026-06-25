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

// When set (default on outside production), the Tako client logs each request,
// response status, raw payload, and extracted value so the wire format is visible.
export const TAKO_DEBUG = process.env.TAKO_DEBUG !== "0";
