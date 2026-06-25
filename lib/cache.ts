import { CACHE_TTL_SECONDS } from "@/lib/constants";
import type { ReceiptData } from "@/lib/receipt/types";

export interface ReceiptCache {
  get(key: string): Promise<ReceiptData | null>;
  set(key: string, value: ReceiptData): Promise<void>;
}

export function cacheKey(company: string, fiscalYear: number): string {
  const normalized = company.trim().toLowerCase().replace(/\s+/g, " ");
  return `receipt:${normalized}:${fiscalYear}`;
}

export class MemoryCache implements ReceiptCache {
  private store = new Map<string, ReceiptData>();
  async get(key: string): Promise<ReceiptData | null> {
    return this.store.get(key) ?? null;
  }
  async set(key: string, value: ReceiptData): Promise<void> {
    this.store.set(key, value);
  }
}

class KvCache implements ReceiptCache {
  // Imported lazily so local/test runs don't require @vercel/kv env wiring.
  async get(key: string): Promise<ReceiptData | null> {
    const { kv } = await import("@vercel/kv");
    return (await kv.get<ReceiptData>(key)) ?? null;
  }
  async set(key: string, value: ReceiptData): Promise<void> {
    const { kv } = await import("@vercel/kv");
    await kv.set(key, value, { ex: CACHE_TTL_SECONDS });
  }
}

let singleton: ReceiptCache | null = null;
export function getCache(): ReceiptCache {
  if (singleton) return singleton;
  singleton = process.env.KV_REST_API_URL ? new KvCache() : new MemoryCache();
  return singleton;
}
