import { describe, expect, it } from "vitest";
import { parseEnv } from "../../src/config/env.js";

const minimal = {
  MONGODB_URI: "mongodb://127.0.0.1:27017/smartroad",
  JWT_SECRET: "0123456789012345678901234567890123456789",
};

describe("parseEnv", () => {
  it("applies defaults for everything optional", () => {
    const env = parseEnv(minimal);
    expect(env.NODE_ENV).toBe("development");
    expect(env.PORT).toBe(5000);
    expect(env.JWT_EXPIRES_IN).toBe("24h");
    expect(env.CORS_ORIGIN).toEqual(["http://localhost:5173"]);
    expect(env.MAP_CENTER_LAT).toBeCloseTo(17.385);
    expect(env.MAP_CENTER_LNG).toBeCloseTo(78.4867);
    expect(env.MAP_ZOOM).toBe(12);
    expect(env.maxUploadBytes).toBe(5 * 1024 * 1024);
    expect(env.TRUST_PROXY).toBe(false);
    expect(env.isProduction).toBe(false);
    expect(Object.isFrozen(env)).toBe(true);
  });

  it("coerces numbers and booleans from strings", () => {
    const env = parseEnv({ ...minimal, PORT: "8080", TRUST_PROXY: "1", MAX_UPLOAD_MB: "2.5", MAP_ZOOM: "13" });
    expect(env.PORT).toBe(8080);
    expect(env.TRUST_PROXY).toBe(true);
    expect(env.maxUploadBytes).toBe(Math.round(2.5 * 1024 * 1024));
    expect(env.MAP_ZOOM).toBe(13);
  });

  it("splits CORS_ORIGIN on commas and trims", () => {
    const env = parseEnv({ ...minimal, CORS_ORIGIN: " http://a.test , https://b.test " });
    expect(env.CORS_ORIGIN).toEqual(["http://a.test", "https://b.test"]);
  });

  it("fails clearly without MONGODB_URI", () => {
    expect(() => parseEnv({ JWT_SECRET: minimal.JWT_SECRET })).toThrow(/MONGODB_URI/);
  });

  it("rejects a short JWT_SECRET", () => {
    expect(() => parseEnv({ ...minimal, JWT_SECRET: "short" })).toThrow(/JWT_SECRET/);
  });

  it("rejects an unknown NODE_ENV and a bad port", () => {
    expect(() => parseEnv({ ...minimal, NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
    expect(() => parseEnv({ ...minimal, PORT: "-1" })).toThrow(/PORT/);
  });
});
