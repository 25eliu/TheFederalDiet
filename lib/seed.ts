import { receiptNumber } from "@/lib/format";
import { shareOfFederal, federallyFed, perHundred, perDollar } from "@/lib/math";
import type { ReceiptData } from "@/lib/receipt/types";

const contracts = 14.1e9;
const total = 401e9;
const revenue = 71e9;
const share = shareOfFederal(contracts, total);
const fed = federallyFed(contracts, revenue);

export const LOCKHEED_SEED: ReceiptData = {
  status: "result",
  company: "Lockheed Martin",
  fiscalYear: 2025,
  receiptNo: receiptNumber("Lockheed Martin", 2025),
  isPrivate: false,
  contracts,
  totalFederalContracts: total,
  revenue,
  netIncome: 5.3e9,
  stockChange1y: -0.04,
  rank: 1,
  shareOfFederal: share,
  federallyFed: fed,
  perHundred: perHundred(share),
  perDollar: perDollar(fed),
  explanation: "Mainly U.S. Department of Defense aircraft, missile, and space programs.",
  takoEmbedUrl: "https://trytako.com",
  candidates: [],
  error: null,
};

export function getSeed(company: string): ReceiptData | null {
  return company.trim().toLowerCase().includes("lockheed") ? LOCKHEED_SEED : null;
}
