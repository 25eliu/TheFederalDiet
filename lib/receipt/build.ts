import { FISCAL_YEAR, totalFederalContracts as configuredTotal } from "@/lib/constants";
import { receiptNumber } from "@/lib/format";
import { shareOfFederal, federallyFed, perHundred, perDollar } from "@/lib/math";
import { parseMarketCap } from "@/lib/tako/client";
import type { SeriesPoint, TakoClient } from "@/lib/tako/types";
import type { ReceiptData } from "./types";

// Query phrasing. The `total` and `rank` searches were removed: `total` mis-matched a
// company named "Total SA" (denominator now comes from a configured constant), and
// `rank` returned no Tako cards. The contracts query requests the full series so we can
// pick the latest COMPLETE fiscal year.
export const queries = {
  contracts: (c: string, fy: number) => `${c} federal contract obligations FY${fy}`,
  revenue: (c: string) => `${c} annual revenue`,
  netIncome: (c: string) => `${c} net income`,
  marketCap: (c: string) => `${c} stock market cap`,
  explanation: (c: string) => `What are ${c}'s US federal contracts mainly for?`,
};

// Federal fiscal year FY ends Sep 30 of its own year; the next FY starts Oct 1.
// Tako stamps annual points at the FY boundary (Oct 1). A point dated Oct 1 of calendar
// year Y is the first day of FY (Y+1), so it represents the just-started (often partial)
// FY (Y+1). The latest COMPLETE fiscal year as of `asOfYear` is the most recent FY that
// ended on or before Sep 30 of asOfYear. We pick the series point whose mapped FY is the
// newest one that is <= the latest complete FY.
export function fiscalYearOfPoint(p: SeriesPoint): number {
  // Oct/Nov/Dec belong to the next FY; otherwise the same calendar year's FY.
  const month = monthOf(p.date);
  return month != null && month >= 10 ? p.year + 1 : p.year;
}

function monthOf(date: string): number | null {
  // numeric "2024-10-01" or "10/01/2024"
  const iso = date.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return parseInt(iso[2], 10);
  const us = date.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (us) return parseInt(us[1], 10);
  const named = date.match(/\b([A-Za-z]{3,})\b/);
  if (named) {
    const m = MONTHS[named[1].slice(0, 3).toLowerCase()];
    if (m) return m;
  }
  return null;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

// The most recent fiscal year that has fully ended as of `asOfFy` (the current
// in-progress FY is excluded), with its value. Null if the series is empty.
export function pickLatestCompleteFiscalYearEntry(
  series: SeriesPoint[],
  asOfFy: number,
): { fy: number; value: number } | null {
  if (!series.length) return null;
  const complete = series
    .map((p) => ({ fy: fiscalYearOfPoint(p), value: p.value }))
    .filter((p) => p.fy <= asOfFy);
  if (!complete.length) return null;
  complete.sort((a, b) => a.fy - b.fy);
  return complete[complete.length - 1];
}

export function pickLatestCompleteFiscalYear(series: SeriesPoint[], asOfFy: number): number | null {
  return pickLatestCompleteFiscalYearEntry(series, asOfFy)?.value ?? null;
}

// Value for a specific calendar year (used to align revenue to the contracts year):
// exact year match, else the most recent year at or below it. Null if none.
export function pickYearValue(series: SeriesPoint[], year: number): number | null {
  if (!series.length) return null;
  const exact = series.find((p) => p.year === year);
  if (exact) return exact.value;
  const below = series.filter((p) => p.year <= year).sort((a, b) => a.year - b.year);
  return below.length ? below[below.length - 1].value : null;
}

export async function buildReceipt(
  company: string,
  client: TakoClient,
  fiscalYear: number = FISCAL_YEAR,
): Promise<ReceiptData> {
  const base: ReceiptData = {
    status: "result",
    company,
    fiscalYear,
    receiptNo: receiptNumber(company, fiscalYear),
    isPrivate: false,
    contracts: null,
    totalFederalContracts: null,
    revenue: null,
    netIncome: null,
    marketCap: null,
    shareOfFederal: null,
    federallyFed: null,
    perHundred: null,
    perDollar: null,
    explanation: null,
    takoEmbedUrl: null,
    contractTimeline: null,
    candidates: [],
    error: null,
  };

  try {
    // All five calls fire in parallel — every query keys off the original company name
    // (the v3 shape exposes no clean "matched" entity), so nothing needs to await the
    // contracts result first. Wall-clock ≈ the slowest single call.
    // Contracts and revenue both request the full series so we can compare the SAME
    // fiscal year rather than mismatched "latest value" points.
    const [contractRes, revenueRes, netIncomeRes, marketCapRes, explanation] = await Promise.all([
      client.searchValue(queries.contracts(company, fiscalYear), { includeContents: true }),
      client.searchValue(queries.revenue(company), { includeContents: true }),
      client.searchValue(queries.netIncome(company)),
      client.searchValue(queries.marketCap(company)),
      client.answer(queries.explanation(company), ["tako", "web"]),
    ]);

    const candidates = contractRes.candidates;
    const takoEmbedUrl = contractRes.embedUrl;

    // The comparison year: the latest COMPLETE fiscal year present in the contracts
    // series. Everything (revenue, denominator, label) is aligned to this one year.
    const contractEntry = pickLatestCompleteFiscalYearEntry(contractRes.series, fiscalYear);
    const contracts = contractEntry?.value ?? contractRes.value;
    const year = contractEntry?.fy ?? fiscalYear;

    if (contracts === null || contracts === 0) {
      if (candidates.length > 1) {
        return { ...base, status: "disambiguation", candidates, takoEmbedUrl };
      }
      return { ...base, status: "no-contracts", candidates, takoEmbedUrl };
    }

    // Revenue for the SAME year (fall back to the description latest if no series).
    const revenue = pickYearValue(revenueRes.series, year) ?? revenueRes.value;
    const total = configuredTotal(year);
    const share = shareOfFederal(contracts, total);

    // Federally fed = federal contracts as a share of that year's revenue. It cannot
    // exceed 100% (a company can't take in more federal money than its total revenue),
    // so cap it — obligations can edge above revenue in big-award years.
    const fedRaw = federallyFed(contracts, revenue);
    const fed = fedRaw === null ? null : Math.min(1, fedRaw);
    const marketCap = parseMarketCap(marketCapRes.description) ?? marketCapRes.value;

    return {
      ...base,
      fiscalYear: year,
      contracts,
      totalFederalContracts: total,
      revenue,
      netIncome: netIncomeRes.value,
      marketCap,
      shareOfFederal: share,
      federallyFed: fed,
      perHundred: perHundred(share),
      perDollar: perDollar(fed),
      explanation,
      isPrivate: revenue === null,
      contractTimeline: contractRes.timeline,
      candidates,
      takoEmbedUrl,
    };
  } catch (e) {
    return { ...base, status: "error", error: e instanceof Error ? e.message : "unknown error" };
  }
}
