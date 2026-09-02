import express, { type Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { asyncHandler } from "../../src/lib/asyncHandler.js";
import { AppError, ERROR_CODES } from "../../src/lib/errors.js";
import { errorHandler, toAppError } from "../../src/middleware/errorHandler.js";
import { validate, type ValidatedRequest } from "../../src/middleware/validate.js";
import { objectIdParam, paginationQuery } from "../../src/validation/common.schema.js";

const schemas = {
  params: objectIdParam,
  query: paginationQuery,
  body: z.object({ title: z.string().min(5), severity: z.enum(["LOW", "MEDIUM", "HIGH"]) }),
};

/** Compile-time check: the parsed values are typed from the schemas. */
const controller = asyncHandler<ValidatedRequest<typeof schemas>>(async (req, res) => {
  const id: string = req.validated.params.id;
  const page: number = req.validated.query.page;
  const title: string = req.validated.body.title;
  const severity: "LOW" | "MEDIUM" | "HIGH" = req.validated.body.severity;
  res.json({ id, page, limit: req.validated.query.limit, title, severity, body: req.validated.body });
});

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.validated = {};
    next();
  });
  app.post("/items/:id", validate(schemas), controller);
  app.get(
    "/boom",
    asyncHandler(async () => {
      throw new Error("async failure");
    }),
  );
  app.use(errorHandler);
});

describe("validate middleware", () => {
  it("stores parsed params, query and body on req.validated and strips unknown fields", async () => {
    const res = await request(app)
      .post("/items/66d5a2b8c2b7a4e8f1a2b3d0?page=2&limit=5")
      .send({ title: "Deep pothole", severity: "HIGH", role: "admin", $where: "1" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: "66d5a2b8c2b7a4e8f1a2b3d0",
      page: 2,
      limit: 5,
      title: "Deep pothole",
      severity: "HIGH",
      body: { title: "Deep pothole", severity: "HIGH" },
    });
  });

  it("collects every issue into one VALIDATION_ERROR with dotted field paths", async () => {
    const res = await request(app).post("/items/nope?page=0").send({ title: "x", severity: "EXTREME" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    const fields = (res.body.error.details as Array<{ field: string }>).map((d) => d.field).sort();
    expect(fields).toEqual(["id", "page", "severity", "title"]);
  });

  it("names the part when the whole body is the wrong type", async () => {
    const res = await request(app)
      .post("/items/66d5a2b8c2b7a4e8f1a2b3d0")
      .set("Content-Type", "application/json")
      .send("[1,2]");
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe("body");
  });
});

describe("asyncHandler", () => {
  it("forwards rejected promises to the error handler", async () => {
    // 5xx responses are logged with their stack; keep the test output clean.
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const res = await request(app).get("/boom");
      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe("INTERNAL_ERROR");
      expect(res.body.error.message).toBe("async failure");
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("AppError", () => {
  it("maps every documented code to its status", () => {
    expect(ERROR_CODES).toEqual({
      VALIDATION_ERROR: 400,
      NOTE_REQUIRED: 400,
      UNAUTHENTICATED: 401,
      INVALID_CREDENTIALS: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      EMAIL_TAKEN: 409,
      INVALID_TRANSITION: 409,
      UPLOAD_TOO_LARGE: 413,
      UNSUPPORTED_FILE_TYPE: 415,
      RATE_LIMITED: 429,
      INTERNAL_ERROR: 500,
      ML_ERROR: 502,
      ML_UNAVAILABLE: 503,
    });
    const err = new AppError("EMAIL_TAKEN", "Taken.");
    expect(err.status).toBe(409);
    expect(err.toBody()).toEqual({ success: false, error: { code: "EMAIL_TAKEN", message: "Taken.", details: [] } });
    expect(AppError.notFound("Incident").message).toBe("Incident not found.");
    expect(AppError.forbidden().status).toBe(403);
    expect(AppError.unauthenticated().status).toBe(401);
    // @ts-expect-error unknown codes are rejected at runtime too
    expect(() => new AppError("NOPE", "x")).toThrow(/Unknown error code/);
  });

  it("converts foreign errors in toAppError", () => {
    expect(toAppError(new AppError("FORBIDDEN", "no")).code).toBe("FORBIDDEN");
    expect(toAppError({ type: "entity.too.large" }).code).toBe("UPLOAD_TOO_LARGE");
    expect(toAppError({ code: 11000, keyPattern: { email: 1 } }).code).toBe("EMAIL_TAKEN");
    expect(toAppError({ code: 11000, keyPattern: { slug: 1 } }).details[0]).toEqual({ field: "slug", message: "slug must be unique." });
    expect(toAppError("string error").code).toBe("INTERNAL_ERROR");
    expect(toAppError(new Error("plain")).message).toBe("plain");
  });
});
