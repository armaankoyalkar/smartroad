import express, { type Express, type Request, type Response } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { env } from "../../src/config/env.js";
import { errorHandler } from "../../src/middleware/errorHandler.js";
import { uploadImage, verifiedFile } from "../../src/middleware/upload.js";
import { gifBuffer, jpegBuffer, pngBuffer, textBuffer, webpBuffer } from "../helpers/images.js";

/** The upload middleware on its own: multipart parsing, size limit, magic-byte check. */
let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.post("/u", uploadImage, (req: Request, res: Response) => {
    const file = verifiedFile(req);
    res.json({
      file: file ? { mime: file.detectedMimeType, declared: file.mimetype, size: file.size, name: file.originalname } : null,
      body: req.body,
    });
  });
  app.use(errorHandler);
});

describe("uploadImage middleware", () => {
  it("accepts a PNG and records the detected type", async () => {
    const res = await request(app).post("/u").field("title", "Pothole").attach("image", pngBuffer(), "photo.png");
    expect(res.status).toBe(200);
    expect(res.body.file).toMatchObject({ mime: "image/png", size: pngBuffer().length, name: "photo.png" });
    expect(res.body.body).toEqual({ title: "Pothole" });
  });

  it("trusts magic bytes, not the declared type or the extension", async () => {
    const jpeg = await request(app)
      .post("/u")
      .attach("image", jpegBuffer(), { filename: "photo.png", contentType: "image/png" });
    expect(jpeg.status).toBe(200);
    expect(jpeg.body.file.mime).toBe("image/jpeg");
    expect(jpeg.body.file.declared).toBe("image/png");

    const webp = await request(app).post("/u").attach("image", webpBuffer(), "picture.bin");
    expect(webp.status).toBe(200);
    expect(webp.body.file.mime).toBe("image/webp");
  });

  it("rejects a GIF with 415 UNSUPPORTED_FILE_TYPE", async () => {
    const res = await request(app).post("/u").attach("image", gifBuffer(), "animation.gif");
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
    expect(res.body.error.details[0]).toMatchObject({ field: "image", detected: "image/gif" });
  });

  it("rejects a text file renamed to .jpg with 415", async () => {
    const res = await request(app).post("/u").attach("image", textBuffer(), "fake.jpg");
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
    expect(res.body.error.details[0].detected).toBeNull();
  });

  it("rejects an oversize image with 413 UPLOAD_TOO_LARGE", async () => {
    const res = await request(app)
      .post("/u")
      .attach("image", pngBuffer(env.maxUploadBytes + 1), "huge.png");
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("UPLOAD_TOO_LARGE");
  });

  it("ignores a plain text field named image", async () => {
    const res = await request(app).post("/u").field("image", "not-a-file").field("title", "x");
    expect(res.status).toBe(200);
    expect(res.body.file).toBeNull();
    expect(res.body.body).toEqual({ image: "not-a-file", title: "x" });
  });

  it("rejects a file on another field or a second file with 400", async () => {
    const wrongField = await request(app).post("/u").attach("photo", pngBuffer(), "photo.png");
    expect(wrongField.status).toBe(400);
    expect(wrongField.body.error.code).toBe("VALIDATION_ERROR");
    expect(wrongField.body.error.details[0].field).toBe("photo");

    const twoFiles = await request(app)
      .post("/u")
      .attach("image", pngBuffer(), "a.png")
      .attach("image", pngBuffer(), "b.png");
    expect(twoFiles.status).toBe(400);
    expect(twoFiles.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("passes JSON requests straight through", async () => {
    const res = await request(app).post("/u").send({ title: "json only" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ file: null, body: { title: "json only" } });
  });
});
