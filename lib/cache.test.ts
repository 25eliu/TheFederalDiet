import { describe, it, expect } from "vitest";
import { MemoryCache, cacheKey } from "./cache";
import type { ReceiptData } from "@/lib/receipt/types";

function sample(company: string): ReceiptData {
  return {
    status: "result", company, fiscalYear: 2025, receiptNo: "0001", isPrivate: false,
    contracts: 1, totalFederalContracts: 2, revenue: 3, netIncome: 4, stockChange1y: 0.1,
    rank: 1, shareOfFederal: 0.5, federallyFed: 0.3, perHundred: 50, perDollar: 0.3,
    explanation: null, takoEmbedUrl: null, contractTimeline: null, candidates: [], error: null,
  };
}

describe("cacheKey", () => {
  it("normalizes name and includes the year", () => {
    expect(cacheKey("  Lockheed   Martin ", 2025)).toBe("receipt:lockheed martin:2025");
  });
});

describe("MemoryCache", () => {
  it("returns null on miss and stores on set", async () => {
    const c = new MemoryCache();
    expect(await c.get("k")).toBeNull();
    await c.set("k", sample("Lockheed Martin"));
    expect((await c.get("k"))!.company).toBe("Lockheed Martin");
  });
});
