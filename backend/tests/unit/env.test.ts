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
    expect(env.API_PORT).toBe(5000);
    expect(env.JWT_EXPIRES_IN).toBe("24h");
    expect(env.CORS_ORIGIN).toEqual(["http://localhost:5173"]);
    expect(env.FRONTEND_URL).toBeUndefined();
    expect(env.MAP_CENTER_LAT).toBeCloseTo(17.385);
    expect(env.MAP_CENTER_LNG).toBeCloseTo(78.4867);
    expect(env.MAP_ZOOM).toBe(12);
    expect(env.maxUploadBytes).toBe(5 * 1024 * 1024);
    expect(env.ML_TIMEOUT_MS).toBe(8000);
    expect(env.ANALYTICS_TIMEZONE).toBe("Asia/Kolkata");
    expect(env.TRUST_PROXY).toBe(false);
    expect(env.isProduction).toBe(false);
    expect(Object.isFrozen(env)).toBe(true);
  });

  it("coerces numbers and booleans from strings", () => {
    const env = parseEnv({ ...minimal, API_PORT: "8080", TRUST_PROXY: "1", MAX_UPLOAD_MB: "2.5", MAP_ZOOM: "13" });
    expect(env.API_PORT).toBe(8080);
    expect(env.TRUST_PROXY).toBe(true);
    expect(env.maxUploadBytes).toBe(Math.round(2.5 * 1024 * 1024));
    expect(env.MAP_ZOOM).toBe(13);
  });

  it("splits CORS_ORIGIN on commas and trims", () => {
    const env = parseEnv({ ...minimal, CORS_ORIGIN: " http://a.test , https://b.test " });
    expect(env.CORS_ORIGIN).toEqual(["http://a.test", "https://b.test"]);
  });

  it("accepts the new variables and validates them", () => {
    const env = parseEnv({
      ...minimal,
      FRONTEND_URL: "https://smartroad.example",
      ANALYTICS_TIMEZONE: "Europe/London",
      ML_TIMEOUT_MS: "12000",
    });
    expect(env.FRONTEND_URL).toBe("https://smartroad.example");
    expect(env.ANALYTICS_TIMEZONE).toBe("Europe/London");
    expect(env.ML_TIMEOUT_MS).toBe(12000);
    expect(() => parseEnv({ ...minimal, FRONTEND_URL: "not a url" })).toThrow(/FRONTEND_URL/);
    expect(() => parseEnv({ ...minimal, ANALYTICS_TIMEZONE: "Mars/Olympus" })).toThrow(/ANALYTICS_TIMEZONE/);
    expect(() => parseEnv({ ...minimal, JWT_EXPIRES_IN: "soon" })).toThrow(/JWT_EXPIRES_IN/);
  });

  it("fails clearly without MONGODB_URI", () => {
    expect(() => parseEnv({ JWT_SECRET: minimal.JWT_SECRET })).toThrow(/MONGODB_URI/);
  });

  it("rejects a short JWT_SECRET", () => {
    expect(() => parseEnv({ ...minimal, JWT_SECRET: "short" })).toThrow(/JWT_SECRET/);
  });

  it("rejects an unknown NODE_ENV and a bad port", () => {
    expect(() => parseEnv({ ...minimal, NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
    expect(() => parseEnv({ ...minimal, API_PORT: "-1" })).toThrow(/API_PORT/);
  });
});
