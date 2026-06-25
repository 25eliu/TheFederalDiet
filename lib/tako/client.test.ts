import { describe, it, expect, vi } from "vitest";
import {
  HttpTakoClient,
  parseSearchResponse,
  parseAnswerResponse,
  parseMagnitude,
  extractValueFromContent,
} from "./client";
import { TAKO_SEARCH_URL, TAKO_ANSWER_URL } from "@/lib/constants";

describe("parseMagnitude", () => {
  it("parses currency tokens with magnitude suffixes", () => {
    expect(parseMagnitude("$14.1B")).toBe(14.1e9);
    expect(parseMagnitude("14.1 billion")).toBe(14.1e9);
    expect(parseMagnitude("$14,100,000,000")).toBe(14_100_000_000);
    expect(parseMagnitude("980M")).toBe(980e6);
    expect(parseMagnitude("1.2T")).toBe(1.2e12);
    expect(parseMagnitude("5,300")).toBe(5300);
  });
  it("returns null for non-numeric tokens", () => {
    expect(parseMagnitude("n/a")).toBeNull();
    expect(parseMagnitude("")).toBeNull();
  });
});

describe("extractValueFromContent", () => {
  it("takes the last numeric cell of the last CSV data row", () => {
    const content = { format: "csv", data: "fiscal_year,obligations\n2024,13900000000\n2025,14100000000" };
    const { value } = extractValueFromContent(content);
    expect(value).toBe(14_100_000_000);
  });
  it("parses a single-figure text content", () => {
    const content = { format: "text", data: "Lockheed Martin received about $14.1 billion in FY2025 federal contract obligations." };
    expect(extractValueFromContent(content).value).toBe(14.1e9);
  });
  it("returns null when content is missing or empty", () => {
    expect(extractValueFromContent(undefined).value).toBeNull();
    expect(extractValueFromContent({ format: "csv", data: "" }).value).toBeNull();
  });
});

describe("parseSearchResponse (real v3 `cards` shape)", () => {
  it("extracts the value from cards[0].content and the embed url", () => {
    const json = {
      cards: [
        {
          card_id: "c1",
          title: "Lockheed Martin — Federal Contract Obligations",
          embed_url: "https://tako.com/embed/abc",
          content: { format: "csv", data: "year,obligations\n2025,14100000000" },
        },
      ],
      request_id: "r1",
    };
    const r = parseSearchResponse(json);
    expect(r.value).toBe(14_100_000_000);
    expect(r.embedUrl).toBe("https://tako.com/embed/abc");
  });

  it("returns null value + empty candidates when there are no cards", () => {
    const r = parseSearchResponse({ cards: [], request_id: "r" });
    expect(r.value).toBeNull();
    expect(r.embedUrl).toBeNull();
    expect(r.candidates).toEqual([]);
  });

  it("returns null value (not a throw) on a foreign/legacy shape", () => {
    // The OLD assumed shape must no longer yield a value — this is the regression
    // that made every company read as 'no contracts'.
    const legacy = { outputs: { knowledge_cards: [{ time_series: [{ value: 42 }] }] } };
    expect(parseSearchResponse(legacy).value).toBeNull();
  });
});

describe("parseAnswerResponse", () => {
  it("reads the `answer` key", () => {
    expect(parseAnswerResponse({ answer: "Mainly DoD aircraft programs." })).toBe("Mainly DoD aircraft programs.");
  });
  it("returns null for empty/whitespace/missing", () => {
    expect(parseAnswerResponse({ answer: "   " })).toBeNull();
    expect(parseAnswerResponse({})).toBeNull();
  });
});

describe("HttpTakoClient.searchValue", () => {
  it("POSTs to the v3 search URL with the api key + query and parses the value", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ cards: [{ embed_url: "u", content: { format: "csv", data: "y,v\n2025,42" } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const client = new HttpTakoClient("secret-key", fetchMock as unknown as typeof fetch);
    const r = await client.searchValue("RTX federal contract obligations FY2025");
    expect(r.value).toBe(42);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(TAKO_SEARCH_URL);
    expect((init as RequestInit).method).toBe("POST");
    expect(((init as RequestInit).headers as Record<string, string>)["X-API-Key"]).toBe("secret-key");
    expect(JSON.parse((init as RequestInit).body as string)).toMatchObject({
      query: "RTX federal contract obligations FY2025",
      effort: "fast",
    });
  });

  it("returns null value on non-200", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("nope", { status: 402 }));
    const client = new HttpTakoClient("k", fetchMock as unknown as typeof fetch);
    expect((await client.searchValue("q")).value).toBeNull();
  });
});

describe("HttpTakoClient.answer", () => {
  it("POSTs to the v1 answer URL with sources as an OBJECT and reads `answer`", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ answer: "Mostly defense programs." }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = new HttpTakoClient("k", fetchMock as unknown as typeof fetch);
    const text = await client.answer("What are RTX's contracts for?", ["tako", "web"]);
    expect(text).toBe("Mostly defense programs.");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(TAKO_ANSWER_URL);
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.sources).toEqual({ tako: {}, web: {} });
    expect(Array.isArray(body.sources)).toBe(false);
  });
});
