import { describe, it, expect, beforeEach, vi } from "vitest";

// Force the seed/no-key path (no TAKO_API_KEY, no KV).
beforeEach(() => {
  vi.resetModules();
  delete process.env.TAKO_API_KEY;
  delete process.env.KV_REST_API_URL;
});

async function call(url: string) {
  const { GET } = await import("./route");
  return GET(new Request(url));
}

describe("GET /api/receipt", () => {
  it("400s on blank company", async () => {
    const res = await call("http://localhost/api/receipt?company=");
    expect(res.status).toBe(400);
  });

  it("returns the Lockheed seed when no API key is configured", async () => {
    const res = await call("http://localhost/api/receipt?company=Lockheed%20Martin");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.company).toBe("Lockheed Martin");
    expect(body.status).toBe("result");
  });

  it("returns an error receipt (not a throw) for unknown company with no key", async () => {
    const res = await call("http://localhost/api/receipt?company=Boeing");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("error");
  });
});
