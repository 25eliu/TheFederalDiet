import { FISCAL_YEAR } from "@/lib/constants";
import { receiptNumber } from "@/lib/format";
import { shareOfFederal, federallyFed, perHundred, perDollar } from "@/lib/math";
import type { TakoClient } from "@/lib/tako/types";
import type { ReceiptData } from "./types";

// Centralized query phrasing — tests and the live verifier must agree on these.
export const queries = {
  contracts: (c: string, fy: number) => `${c} federal contract obligations FY${fy}`,
  total: (fy: number) => `total US federal contract obligations FY${fy}`,
  revenue: (c: string) => `${c} annual revenue`,
  netIncome: (c: string) => `${c} net income`,
  stock: (c: string) => `${c} stock 1 year price change`,
  rank: (c: string, fy: number) => `${c} rank among federal contractors FY${fy}`,
  explanation: (c: string) => `What are ${c}'s US federal contracts mainly for?`,
};

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
    stockChange1y: null,
    rank: null,
    shareOfFederal: null,
    federallyFed: null,
    perHundred: null,
    perDollar: null,
    explanation: null,
    takoEmbedUrl: null,
    candidates: [],
    error: null,
  };

  try {
    const contractRes = await client.searchValue(queries.contracts(company, fiscalYear));
    const candidates = contractRes.candidates;
    const takoEmbedUrl = contractRes.embedUrl;
    const matchedName = contractRes.matched ?? company;

    // No contract value found.
    if (contractRes.value === null || contractRes.value === 0) {
      // Ambiguous: several candidate entities but nothing resolved.
      if (contractRes.candidates.length > 1) {
        return { ...base, status: "disambiguation", candidates, takoEmbedUrl };
      }
      return { ...base, status: "no-contracts", candidates, takoEmbedUrl };
    }

    // Resolve the remaining figures in parallel.
    const [total, revenue, netIncome, stock, rank, explanation] = await Promise.all([
      client.searchValue(queries.total(fiscalYear)),
      client.searchValue(queries.revenue(matchedName)),
      client.searchValue(queries.netIncome(matchedName)),
      client.searchValue(queries.stock(matchedName)),
      client.searchValue(queries.rank(matchedName, fiscalYear)),
      client.answer(queries.explanation(matchedName), ["tako", "web"]),
    ]);

    const contracts = contractRes.value;
    const share = shareOfFederal(contracts, total.value);
    const fed = federallyFed(contracts, revenue.value);

    return {
      ...base,
      company: matchedName,
      contracts,
      totalFederalContracts: total.value,
      revenue: revenue.value,
      netIncome: netIncome.value,
      stockChange1y: stock.value,
      rank: rank.value,
      shareOfFederal: share,
      federallyFed: fed,
      perHundred: perHundred(share),
      perDollar: perDollar(fed),
      explanation,
      isPrivate: revenue.value === null,
      candidates,
      takoEmbedUrl,
    };
  } catch (e) {
    return { ...base, status: "error", error: e instanceof Error ? e.message : "unknown error" };
  }
}
