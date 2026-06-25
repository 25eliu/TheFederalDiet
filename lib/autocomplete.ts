import { COMPANIES, type Company } from "./companies";

export interface Suggestion {
  name: string; // canonical company name to search
  matched: string; // the string (name or alias) that matched
}

// Score a single candidate string against the query. Higher is better; 0 = no match.
// Ranking: exact > prefix > word-boundary > substring > subsequence (fuzzy).
function scoreString(query: string, candidate: string): number {
  const q = query.trim().toLowerCase();
  const c = candidate.toLowerCase();
  if (!q) return 0;
  if (c === q) return 1000;
  if (c.startsWith(q)) return 800 - (c.length - q.length); // shorter remainder ranks higher
  // word-boundary prefix (e.g. "boe" → "The Boeing Company")
  if (c.split(/[\s.&-]+/).some((w) => w.startsWith(q))) return 600;
  const idx = c.indexOf(q);
  if (idx >= 0) return 400 - idx;
  return subsequenceScore(q, c);
}

// Fuzzy: are all of q's characters present in order within c? Cheap "vbose typo" tolerance.
function subsequenceScore(q: string, c: string): number {
  let ci = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    const found = c.indexOf(ch, ci);
    if (found < 0) return 0;
    ci = found + 1;
  }
  return 100 - Math.min(99, c.length - q.length); // mild penalty for longer strings
}

function bestScore(query: string, company: Company): { score: number; matched: string } {
  let best = { score: scoreString(query, company.name), matched: company.name };
  for (const alias of company.aliases ?? []) {
    const s = scoreString(query, alias);
    if (s > best.score) best = { score: s, matched: alias };
  }
  return best;
}

// Return up to `limit` company suggestions for the query, best first.
export function suggestCompanies(query: string, limit = 6, list: Company[] = COMPANIES): Suggestion[] {
  const q = query.trim();
  if (q.length < 1) return [];
  return list
    .map((company) => ({ company, ...bestScore(q, company) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.company.name.length - b.company.name.length)
    .slice(0, limit)
    .map((r) => ({ name: r.company.name, matched: r.matched }));
}
