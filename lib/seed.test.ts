import { describe, it, expect } from "vitest";
import { LOCKHEED_SEED, getSeed } from "./seed";

describe("seed", () => {
  it("has a fully-formed Lockheed receipt", () => {
    expect(LOCKHEED_SEED.status).toBe("result");
    expect(LOCKHEED_SEED.company).toMatch(/Lockheed/);
    expect(LOCKHEED_SEED.contracts).toBeGreaterThan(0);
    expect(LOCKHEED_SEED.federallyFed).not.toBeNull();
  });
  it("matches lockheed case-insensitively", () => {
    expect(getSeed("lockheed martin")).not.toBeNull();
    expect(getSeed("Boeing")).toBeNull();
  });
});
