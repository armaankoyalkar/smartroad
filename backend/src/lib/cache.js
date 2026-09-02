/**
 * Small in-memory TTL cache for expensive results (public statistics, ML model
 * info, hotspot clusters). One process, no persistence: exactly what a single
 * API instance needs and nothing more.
 */
export class TtlCache {
  constructor() {
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  /** Return the cached value or compute, store and return it. */
  async getOrSet(key, ttlMs, compute) {
    const cached = this.get(key);
    if (cached !== undefined) return { value: cached, cached: true };
    const value = await compute();
    this.set(key, value, ttlMs);
    return { value, cached: false };
  }
}

export const cache = new TtlCache();
