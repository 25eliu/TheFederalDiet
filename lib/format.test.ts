import { describe, it, expect } from "vitest";
import {
  formatCompactUSD,
  formatPercent,
  formatSignedPercent,
  formatUSD2,
  receiptNumber,
} from "./format";

describe("formatCompactUSD", () => {
  it("abbreviates billions/millions/thousands", () => {
    expect(formatCompactUSD(14_100_000_000)).toBe("$14.1B");
    expect(formatCompactUSD(250_000_000)).toBe("$250M");
    expect(formatCompactUSD(980_000)).toBe("$980K");
    expect(formatCompactUSD(500)).toBe("$500");
  });
  it("shows data unavailable for null", () => {
    expect(formatCompactUSD(null)).toBe("data unavailable");
  });
});

describe("formatPercent", () => {
  it("formats a fraction to one decimal", () => {
    expect(formatPercent(0.368)).toBe("36.8%");
    expect(formatPercent(0.035, 2)).toBe("3.50%");
  });
  it("handles null", () => {
    expect(formatPercent(null)).toBe("data unavailable");
  });
});

describe("formatSignedPercent", () => {
  it("prefixes sign and uses a real minus", () => {
    expect(formatSignedPercent(0.13)).toBe("+13.0%");
    expect(formatSignedPercent(-0.052)).toBe("−5.2%");
  });
});

describe("formatUSD2", () => {
  it("formats to two decimals", () => {
    expect(formatUSD2(36.8)).toBe("$36.80");
    expect(formatUSD2(null)).toBe("data unavailable");
  });
});

describe("receiptNumber", () => {
  it("is deterministic and four digits", () => {
    const a = receiptNumber("Lockheed Martin", 2025);
    const b = receiptNumber("Lockheed Martin", 2025);
    expect(a).toBe(b);
    expect(a).toMatch(/^\d{4}$/);
  });
  it("differs by company", () => {
    expect(receiptNumber("Boeing", 2025)).not.toBe(receiptNumber("Palantir", 2025));
  });
});
