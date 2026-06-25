import { describe, it, expect } from "vitest";
import { buildReceipt } from "./build";
import { FakeTakoClient } from "@/lib/tako/fake";

const fullScript = {
  searches: [
    { match: "lockheed martin federal contract", result: { value: 14.1e9, embedUrl: "https://trytako.com/embed/lm", matched: "Lockheed Martin", candidates: [{ name: "Lockheed Martin", entityId: "v1" }] } },
    { match: "total", result: { value: 401e9 } },
    { match: "revenue", result: { value: 71e9 } },
    { match: "net income", result: { value: 5.3e9 } },
    { match: "stock", result: { value: -0.04 } },
    { match: "rank", result: { value: 1 } },
  ],
  answer: "Mainly DoD aircraft, missile, and space programs.",
};

describe("buildReceipt", () => {
  it("assembles a full result with computed ratios", async () => {
    const r = await buildReceipt("Lockheed Martin", new FakeTakoClient(fullScript), 2025);
    expect(r.status).toBe("result");
    expect(r.contracts).toBe(14.1e9);
    expect(r.totalFederalContracts).toBe(401e9);
    expect(r.shareOfFederal!).toBeCloseTo(0.03516, 5);
    expect(r.federallyFed!).toBeCloseTo(0.19859, 5);
    expect(r.perHundred!).toBeCloseTo(3.516, 3);
    expect(r.isPrivate).toBe(false);
    expect(r.explanation).toContain("DoD");
    expect(r.takoEmbedUrl).toBe("https://trytako.com/embed/lm");
    expect(r.receiptNo).toMatch(/^\d{4}$/);
  });

  it("flags no-contracts when contract value is missing/zero", async () => {
    const r = await buildReceipt("Ben & Jerry's", new FakeTakoClient({ searches: [], answer: null }), 2025);
    expect(r.status).toBe("no-contracts");
    expect(r.federallyFed).toBeNull();
  });

  it("flags disambiguation when matches are ambiguous and no value resolved", async () => {
    const script = {
      searches: [
        { match: "apple federal contract", result: { value: null, candidates: [
          { name: "Apple Inc.", entityId: "c1" },
          { name: "Apple Hospitality REIT", entityId: "c2" },
        ] } },
      ],
    };
    const r = await buildReceipt("Apple", new FakeTakoClient(script), 2025);
    expect(r.status).toBe("disambiguation");
    expect(r.candidates).toHaveLength(2);
  });

  it("marks private companies (contracts but no revenue) and skips the stamp value", async () => {
    const script = {
      searches: [
        { match: "palantir federal contract", result: { value: 1.2e9, matched: "Palantir", candidates: [{ name: "Palantir", entityId: "v9" }] } },
        { match: "total", result: { value: 401e9 } },
        // no revenue card
      ],
      answer: "Data analytics for defense and civilian agencies.",
    };
    const r = await buildReceipt("SecretCorp", new FakeTakoClient(script), 2025);
    expect(r.status).toBe("result");
    expect(r.isPrivate).toBe(true);
    expect(r.federallyFed).toBeNull();
    expect(r.shareOfFederal).not.toBeNull();
  });
});
