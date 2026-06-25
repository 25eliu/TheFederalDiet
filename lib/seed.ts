import { totalFederalContracts } from "@/lib/constants";
import { receiptNumber } from "@/lib/format";
import { shareOfFederal, federallyFed, perHundred, perDollar } from "@/lib/math";
import type { ReceiptData } from "@/lib/receipt/types";

// Illustrative Lockheed Martin FY2025 figures, used only as the no-API-key fallback so
// the page is never empty. Federal-contract figure ≈ published FY2025 prime awards;
// revenue/net income/market cap from S&P Global / Xignite via Tako. The live path
// replaces these with real Tako values.
const FY = 2025;
const contracts = 50.5e9;
const total = totalFederalContracts(FY);
const revenue = 75.0e9;
const share = shareOfFederal(contracts, total);
const fed = federallyFed(contracts, revenue);

export const LOCKHEED_SEED: ReceiptData = {
  status: "result",
  company: "Lockheed Martin",
  fiscalYear: FY,
  receiptNo: receiptNumber("Lockheed Martin", FY),
  isPrivate: false,
  contracts,
  totalFederalContracts: total,
  revenue,
  netIncome: 5.02e9,
  marketCap: 113.35e9,
  shareOfFederal: share,
  federallyFed: fed,
  perHundred: perHundred(share),
  perDollar: perDollar(fed),
  explanation: "Mainly U.S. Department of Defense aircraft, missile, and space programs.",
  takoEmbedUrl: "https://tako.com/embed/5SUQ1YgDQqNwXiuO9rjZ/",
  contractTimeline: { startYear: 2007, endYear: 2025, peak: 76.1e9, peakYear: 2019 },
  candidates: [],
  error: null,
};

export function getSeed(company: string): ReceiptData | null {
  return company.trim().toLowerCase().includes("lockheed") ? LOCKHEED_SEED : null;
}
