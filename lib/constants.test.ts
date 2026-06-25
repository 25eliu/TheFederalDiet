import { describe, it, expect } from "vitest";
import { FISCAL_YEAR, MONEY_GREEN, STAMP_RED, TAKO_SEARCH_URL, TAKO_ANSWER_URL } from "./constants";

describe("constants", () => {
  it("defaults fiscal year to 2025", () => {
    expect(FISCAL_YEAR).toBe(2025);
  });
  it("uses the spec colors", () => {
    expect(MONEY_GREEN).toBe("#1B4D3E");
    expect(STAMP_RED).toBe("#B0271F");
  });
  it("defaults the Tako search endpoint to the v3 API", () => {
    expect(TAKO_SEARCH_URL).toBe("https://tako.com/api/v3/search/");
  });
  it("defaults the Tako answer endpoint to the v1 API", () => {
    expect(TAKO_ANSWER_URL).toBe("https://tako.com/api/v1/answer/");
  });
});
