import { describe, it, expect } from "vitest";
import { FISCAL_YEAR, MONEY_GREEN, STAMP_RED, TAKO_BASE_URL } from "./constants";

describe("constants", () => {
  it("defaults fiscal year to 2025", () => {
    expect(FISCAL_YEAR).toBe(2025);
  });
  it("uses the spec colors", () => {
    expect(MONEY_GREEN).toBe("#1B4D3E");
    expect(STAMP_RED).toBe("#B0271F");
  });
  it("defaults the Tako base url", () => {
    expect(TAKO_BASE_URL).toBe("https://trytako.com/api/v3");
  });
});
