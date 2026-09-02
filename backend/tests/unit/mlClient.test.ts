import http from "node:http";
import { type AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type RiskFeatures } from "../../src/config/mlFeatures.js";
import { AppError } from "../../src/lib/errors.js";
import * as mlClient from "../../src/lib/mlClient.js";

/**
 * The client against (a) nothing listening (the test env points at a closed
 * port) and (b) a tiny stand-in HTTP server that answers like the FastAPI
 * service would. No real model is involved.
 */
const FEATURES: RiskFeatures = {
  hour: 18,
  day_of_week: "FRI",
  month: 11,
  light_conditions: "DARK_LIT",
  weather: "RAIN",
  road_surface: "WET",
  road_type: "ARTERIAL",
  speed_limit: 60,
  area_type: "URBAN",
  category: "ACCIDENT",
};

let server: http.Server;
let baseURL: string;
let lastRequest: { method?: string; url?: string; body: string; headers: http.IncomingHttpHeaders } | null = null;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      lastRequest = { method: req.method, url: req.url, body, headers: req.headers };
      const reply = (status: number, payload: unknown) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(payload));
      };
      if (req.url === "/estimate/risk") {
        return reply(200, {
          risk_level: "HIGH",
          probabilities: { LOW: 0.12, MEDIUM: 0.33, HIGH: 0.55 },
          model_version: "demo-rf-1.0.0",
          is_demo_model: true,
          contributions: [],
          disclaimer: "Estimate from historical data.",
        });
      }
      if (req.url === "/unprocessable") return reply(422, { detail: [{ loc: ["body", "features"], msg: "field required" }] });
      if (req.url === "/no-model") return reply(503, { detail: "Model artifacts not found. Run the training pipeline first." });
      return reply(404, { detail: "Not Found" });
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("request()", () => {
  it("returns the JSON body on success and sends the payload as JSON", async () => {
    const data = await mlClient.request<{ risk_level: string }>({
      method: "post",
      url: "/estimate/risk",
      baseURL,
      data: { features: FEATURES },
    });
    expect(data.risk_level).toBe("HIGH");
    expect(lastRequest?.method).toBe("POST");
    expect(JSON.parse(lastRequest?.body ?? "{}")).toEqual({ features: FEATURES });
    expect(lastRequest?.headers["content-type"]).toMatch(/application\/json/);
  });

  it("maps an HTTP error (including a 422 from pydantic) to ML_ERROR 502 with the status in the details", async () => {
    let caught: unknown;
    try {
      await mlClient.request({ method: "get", url: "/unprocessable", baseURL });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AppError);
    expect((caught as AppError).code).toBe("ML_ERROR");
    expect((caught as AppError).status).toBe(502);
    expect((caught as AppError).details[0]).toMatchObject({ status: 422 });
    expect(String((caught as AppError).details[0]?.detail)).toContain("field required");

    await expect(mlClient.request({ method: "get", url: "/no-model", baseURL })).rejects.toMatchObject({
      code: "ML_ERROR",
      details: [{ status: 503 }],
    });
  });

  it("maps connection failures to ML_UNAVAILABLE 503", async () => {
    await expect(mlClient.estimateRisk(FEATURES)).rejects.toMatchObject({ code: "ML_UNAVAILABLE", status: 503 });
    await expect(mlClient.modelInfo()).rejects.toMatchObject({ code: "ML_UNAVAILABLE" });
    await expect(mlClient.estimateRiskBatch([{ id: "a", features: FEATURES }])).rejects.toMatchObject({
      code: "ML_UNAVAILABLE",
    });
    await expect(mlClient.hotspots([{ id: "a", lat: 17.4, lng: 78.3 }], 200, 4)).rejects.toMatchObject({
      code: "ML_UNAVAILABLE",
    });
  });
});

describe("health()", () => {
  it("never throws and reports the service as down when unreachable", async () => {
    const check = await mlClient.health();
    expect(check).toMatchObject({ status: "down", modelLoaded: false, modelVersion: null, error: "ML_UNAVAILABLE" });
    expect(check.latencyMs).toBeTypeOf("number");
  });
});

describe("size caps", () => {
  it("refuses batches and point sets over the documented maximum before calling the service", () => {
    const items = Array.from({ length: mlClient.ML_MAX_BATCH_ITEMS + 1 }, (_, i) => ({ id: String(i), features: FEATURES }));
    expect(() => mlClient.estimateRiskBatch(items)).toThrow(RangeError);
    const points = Array.from({ length: mlClient.ML_MAX_HOTSPOT_POINTS + 1 }, (_, i) => ({ id: String(i), lat: 17, lng: 78 }));
    expect(() => mlClient.hotspots(points, 200, 4)).toThrow(RangeError);
  });
});
