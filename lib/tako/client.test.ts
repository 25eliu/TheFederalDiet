import { describe, it, expect, vi } from "vitest";
import { HttpTakoClient, parseSearchResponse } from "./client";

describe("parseSearchResponse", () => {
  it("extracts the top numeric value and embed url", () => {
    const json = {
      outputs: {
        knowledge_cards: [
          {
            embed_url: "https://trytako.com/embed/abc",
            title: "Lockheed Martin federal obligations",
            entity: { name: "Lockheed Martin", id: "v-123" },
            time_series: [{ value: 14_100_000_000 }],
          },
        ],
      },
    };
    const r = parseSearchResponse(json);
    expect(r.value).toBe(14_100_000_000);
    expect(r.embedUrl).toBe("https://trytako.com/embed/abc");
    expect(r.matched).toBe("Lockheed Martin");
    expect(r.candidates).toEqual([{ name: "Lockheed Martin", entityId: "v-123" }]);
  });

  it("returns nulls and empty candidates when no cards", () => {
    const r = parseSearchResponse({ outputs: { knowledge_cards: [] } });
    expect(r.value).toBeNull();
    expect(r.embedUrl).toBeNull();
    expect(r.candidates).toEqual([]);
  });

  it("collects multiple candidates for disambiguation", () => {
    const json = {
      outputs: {
        knowledge_cards: [
          { entity: { name: "Apple Inc.", id: "c-1" }, time_series: [{ value: 1 }] },
          { entity: { name: "Apple Hospitality", id: "c-2" }, time_series: [{ value: 2 }] },
        ],
      },
    };
    expect(parseSearchResponse(json).candidates).toHaveLength(2);
  });
});

describe("HttpTakoClient", () => {
  it("sends the api key and query, returns parsed value", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          outputs: { knowledge_cards: [{ embed_url: "u", time_series: [{ value: 42 }] }] },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new HttpTakoClient("secret-key", "https://trytako.com/api/v3", fetchMock as unknown as typeof fetch);
    const r = await client.searchValue("test query");
    expect(r.value).toBe(42);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://trytako.com/api/v3/search/");
    expect((init as RequestInit).method).toBe("POST");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["X-API-Key"]).toBe("secret-key");
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({ query: "test query", effort: "fast" });
  });

  it("returns null value on non-200", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("nope", { status: 402 }));
    const client = new HttpTakoClient("k", "https://trytako.com/api/v3", fetchMock as unknown as typeof fetch);
    const r = await client.searchValue("q");
    expect(r.value).toBeNull();
  });
});
