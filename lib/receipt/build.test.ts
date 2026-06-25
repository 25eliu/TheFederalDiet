import { describe, it, expect } from "vitest";
import { buildReceipt, pickLatestCompleteFiscalYear, fiscalYearOfPoint, pickYearValue } from "./build";
import { FakeTakoClient } from "@/lib/tako/fake";
import { totalFederalContracts } from "@/lib/constants";

// Contracts come back as a full annual series (include_contents). Dates stamped Oct 1
// belong to the NEXT fiscal year, so 2024-10-01 → FY2025 and 2025-10-01 → FY2026.
const contractSeries = [
  { date: "2023-10-01", year: 2023, value: 40e9 }, // FY2024
  { date: "2024-10-01", year: 2024, value: 50.5e9 }, // FY2025  ← latest complete
  { date: "2025-10-01", year: 2025, value: 14.1e9 }, // FY2026 (partial, excluded)
];

const fullScript = {
  searches: [
    { match: "federal contract", result: { value: 14.1e9, series: contractSeries, embedUrl: "https://tako.com/embed/lm", timeline: { startYear: 2007, endYear: 2025, peak: 76.1e9, peakYear: 2019 } } },
    { match: "annual revenue", result: { value: 71e9 } },
    { match: "net income", result: { value: 5.3e9 } },
    { match: "market cap", result: { description: "Lockheed Martin stock price is $493.70. Current market cap is $113.35B." } },
  ],
  answer: "Mainly DoD aircraft, missile, and space programs.",
};

describe("fiscalYearOfPoint", () => {
  it("maps Oct–Dec into the next fiscal year", () => {
    expect(fiscalYearOfPoint({ date: "2024-10-01", year: 2024, value: 1 })).toBe(2025);
    expect(fiscalYearOfPoint({ date: "Oct 1, 2024", year: 2024, value: 1 })).toBe(2025);
    expect(fiscalYearOfPoint({ date: "2024-05-01", year: 2024, value: 1 })).toBe(2024);
  });
});

describe("pickLatestCompleteFiscalYear", () => {
  it("returns the most recent COMPLETE fiscal year, excluding the in-progress one", () => {
    expect(pickLatestCompleteFiscalYear(contractSeries, 2025)).toBe(50.5e9);
  });
  it("returns null for an empty series", () => {
    expect(pickLatestCompleteFiscalYear([], 2025)).toBeNull();
  });
});

describe("pickYearValue", () => {
  const series = [
    { date: "2023-12-31", year: 2023, value: 67e9 },
    { date: "2024-12-31", year: 2024, value: 71e9 },
    { date: "2025-12-31", year: 2025, value: 75e9 },
  ];
  it("returns the exact calendar-year value", () => {
    expect(pickYearValue(series, 2024)).toBe(71e9);
  });
  it("falls back to the most recent year at or below", () => {
    expect(pickYearValue(series, 2026)).toBe(75e9);
    expect(pickYearValue(series, 2019)).toBeNull();
  });
});

describe("buildReceipt", () => {
  it("uses the latest complete FY, the constant denominator, and market cap", async () => {
    const r = await buildReceipt("Lockheed Martin", new FakeTakoClient(fullScript), 2025);
    expect(r.status).toBe("result");
    expect(r.contracts).toBe(50.5e9); // FY2025 complete year, NOT the partial $14.1B point
    expect(r.totalFederalContracts).toBe(totalFederalContracts(2025));
    expect(r.shareOfFederal!).toBeCloseTo(50.5e9 / totalFederalContracts(2025)!, 6);
    expect(r.federallyFed!).toBeCloseTo(50.5e9 / 71e9, 6);
    expect(r.marketCap).toBe(113.35e9);
    expect(r.isPrivate).toBe(false);
    expect(r.contractTimeline).toEqual({ startYear: 2007, endYear: 2025, peak: 76.1e9, peakYear: 2019 });
    expect(r.explanation).toContain("DoD");
    expect(r.takoEmbedUrl).toBe("https://tako.com/embed/lm");
  });

  it("shareOfFederal stays well under 1 (the >$100 bug is fixed)", async () => {
    const r = await buildReceipt("Lockheed Martin", new FakeTakoClient(fullScript), 2025);
    expect(r.shareOfFederal!).toBeLessThan(1);
    expect(r.perHundred!).toBeLessThan(100);
  });

  it("compares revenue from the SAME year as the contracts figure", async () => {
    const script = {
      searches: [
        { match: "federal contract", result: { series: [
          { date: "2024-10-01", year: 2024, value: 48e9 }, // FY2025
        ] } },
        { match: "annual revenue", result: { value: 75e9, series: [
          { date: "2024-12-31", year: 2024, value: 71e9 },
          { date: "2025-12-31", year: 2025, value: 75e9 }, // FY2025 → use this
        ] } },
      ],
    };
    const r = await buildReceipt("Lockheed Martin", new FakeTakoClient(script), 2025);
    expect(r.fiscalYear).toBe(2025);
    expect(r.contracts).toBe(48e9);
    expect(r.revenue).toBe(75e9); // 2025 revenue, matched to the FY2025 contracts year
    expect(r.federallyFed!).toBeCloseTo(48 / 75, 4);
  });

  it("caps federally-fed at 100% when contracts exceed revenue", async () => {
    const script = {
      searches: [
        { match: "federal contract", result: { series: [{ date: "2024-10-01", year: 2024, value: 80e9 }] } },
        { match: "annual revenue", result: { series: [{ date: "2025-12-31", year: 2025, value: 75e9 }] } },
      ],
    };
    const r = await buildReceipt("Lockheed Martin", new FakeTakoClient(script), 2025);
    expect(r.federallyFed).toBe(1); // not 1.067
    expect(r.perDollar).toBe(1);
  });

  it("falls back to the description latest value when no series is returned", async () => {
    const script = {
      searches: [
        { match: "federal contract", result: { value: 12.9e9 } }, // no series
        { match: "annual revenue", result: { value: 89e9 } },
      ],
    };
    const r = await buildReceipt("The Boeing Company", new FakeTakoClient(script), 2025);
    expect(r.contracts).toBe(12.9e9);
  });

  it("flags no-contracts when no contract value resolves", async () => {
    const r = await buildReceipt("Ben & Jerry's", new FakeTakoClient({ searches: [], answer: null }), 2025);
    expect(r.status).toBe("no-contracts");
    expect(r.federallyFed).toBeNull();
  });

  it("flags disambiguation when ambiguous and nothing resolved", async () => {
    const script = {
      searches: [
        { match: "federal contract", result: { value: null, candidates: [
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
        { match: "federal contract", result: { value: 1.2e9 } },
        // no revenue card
      ],
      answer: "Data analytics for defense and civilian agencies.",
    };
    const r = await buildReceipt("SecretCorp", new FakeTakoClient(script), 2025);
    expect(r.status).toBe("result");
    expect(r.isPrivate).toBe(true);
    expect(r.federallyFed).toBeNull();
    expect(r.shareOfFederal).not.toBeNull(); // constant denominator still gives a share
  });
});
