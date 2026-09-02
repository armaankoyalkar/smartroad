/**
 * Small in-memory TTL cache for expensive results (public statistics, ML model
 * info, hotspot clusters). One process, no persistence: exactly what a single
 * API instance needs and nothing more.
 */

interface Entry {
  value: unknown;
  expiresAt: number;
}

export interface CacheResult<T> {
  value: T;
  cached: boolean;
}

export class TtlCache {
  private readonly store = new Map<string, Entry>();

  get<T = unknown>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): T {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  /** Remove every key, or only those starting with `prefix`. */
  clear(prefix?: string): void {
    if (prefix === undefined) {
      this.store.clear();
      return;
    }
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  get size(): number {
    return this.store.size;
  }

  /** Return the cached value or compute, store and return it. */
  async getOrSet<T>(key: string, ttlMs: number, compute: () => Promise<T> | T): Promise<CacheResult<T>> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return { value: cached, cached: true };
    const value = await compute();
    this.set(key, value, ttlMs);
    return { value, cached: false };
  }
}

export const cache = new TtlCache();
