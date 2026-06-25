import { describe, it, expect } from "vitest";
import { shareOfFederal, federallyFed, perHundred, perDollar } from "./math";

describe("shareOfFederal", () => {
  it("divides contracts by total", () => {
    expect(shareOfFederal(14.1e9, 401e9)!).toBeCloseTo(0.03516, 5);
  });
  it("returns null on null or zero denominator", () => {
    expect(shareOfFederal(null, 401e9)).toBeNull();
    expect(shareOfFederal(14e9, 0)).toBeNull();
    expect(shareOfFederal(14e9, null)).toBeNull();
  });
});

describe("federallyFed", () => {
  it("divides contracts by revenue", () => {
    expect(federallyFed(14.1e9, 71e9)!).toBeCloseTo(0.19859, 5);
  });
  it("returns null when revenue missing", () => {
    expect(federallyFed(14e9, null)).toBeNull();
  });
});

describe("perHundred / perDollar", () => {
  it("scales share by 100 and passes fed through", () => {
    expect(perHundred(0.0351)!).toBeCloseTo(3.51, 5);
    expect(perDollar(0.198)!).toBeCloseTo(0.198, 5);
    expect(perHundred(null)).toBeNull();
  });
});
