import type { Candidate } from "@/lib/tako/types";

export type ReceiptStatus = "result" | "no-contracts" | "disambiguation" | "error";

export interface ReceiptData {
  status: ReceiptStatus;
  company: string;
  fiscalYear: number;
  receiptNo: string;
  isPrivate: boolean;

  contracts: number | null;
  totalFederalContracts: number | null;
  revenue: number | null;
  netIncome: number | null;
  stockChange1y: number | null;
  rank: number | null;

  shareOfFederal: number | null;
  federallyFed: number | null;
  perHundred: number | null;
  perDollar: number | null;

  explanation: string | null;
  takoEmbedUrl: string | null;

  candidates: Candidate[];
  error: string | null;
}
