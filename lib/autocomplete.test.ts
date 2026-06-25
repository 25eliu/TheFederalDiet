import { describe, it, expect } from "vitest";
import { suggestCompanies } from "./autocomplete";

describe("suggestCompanies", () => {
  it("returns nothing for an empty query", () => {
    expect(suggestCompanies("")).toEqual([]);
  });

  it("prefix-matches the canonical name", () => {
    const out = suggestCompanies("lockh");
    expect(out[0].name).toBe("Lockheed Martin");
  });

  it("matches via alias (ticker) and returns the canonical name", () => {
    const out = suggestCompanies("LMT");
    expect(out[0].name).toBe("Lockheed Martin");
    expect(out[0].matched).toBe("LMT");
  });

  it("matches a former/common name alias", () => {
    const out = suggestCompanies("raytheon");
    expect(out[0].name).toBe("RTX");
  });

  it("word-boundary matches an interior word", () => {
    const out = suggestCompanies("boeing");
    expect(out.some((s) => s.name === "The Boeing Company")).toBe(true);
  });

  it("respects the limit", () => {
    expect(suggestCompanies("a", 3).length).toBeLessThanOrEqual(3);
  });

  it("uses a custom list when provided", () => {
    const out = suggestCompanies("acme", 6, [{ name: "Acme Corp" }, { name: "Other" }]);
    expect(out).toEqual([{ name: "Acme Corp", matched: "Acme Corp" }]);
  });
});
