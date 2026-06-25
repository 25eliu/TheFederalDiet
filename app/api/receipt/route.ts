import { FISCAL_YEAR } from "@/lib/constants";
import { getCache, cacheKey } from "@/lib/cache";
import { buildReceipt } from "@/lib/receipt/build";
import type { ReceiptData } from "@/lib/receipt/types";
import { HttpTakoClient } from "@/lib/tako/client";
import { getSeed } from "@/lib/seed";

export const runtime = "nodejs";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorReceipt(company: string, message: string): ReceiptData {
  return {
    status: "error", company, fiscalYear: FISCAL_YEAR, receiptNo: "0000", isPrivate: false,
    contracts: null, totalFederalContracts: null, revenue: null, netIncome: null,
    marketCap: null, shareOfFederal: null, federallyFed: null,
    perHundred: null, perDollar: null, explanation: null, takoEmbedUrl: null,
    contractTimeline: null, candidates: [], error: message,
  };
}

export async function GET(req: Request): Promise<Response> {
  const company = new URL(req.url).searchParams.get("company")?.trim() ?? "";
  if (!company) return json({ error: "company is required" }, 400);

  const cache = getCache();
  const key = cacheKey(company, FISCAL_YEAR);

  const cached = await cache.get(key);
  if (cached) return json(cached);

  const apiKey = process.env.TAKO_API_KEY;
  if (!apiKey) {
    const seed = getSeed(company);
    if (seed) {
      await cache.set(key, seed);
      return json(seed);
    }
    return json(errorReceipt(company, "Tako API key not configured"));
  }

  const client = new HttpTakoClient(apiKey);
  const receipt = await buildReceipt(company, client, FISCAL_YEAR);

  // Only cache successful, resolvable receipts — not transient errors.
  if (receipt.status === "result" || receipt.status === "no-contracts") {
    await cache.set(key, receipt);
  }
  return json(receipt);
}
