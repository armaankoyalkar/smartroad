import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  deleteImage,
  extensionFor,
  isSafeFilename,
  publicUrl,
  resolveUploadPath,
  saveImage,
  storage,
  UPLOAD_ROOT,
} from "../../src/lib/storage.js";
import { jpegBuffer, pngBuffer, webpBuffer } from "../helpers/images.js";
import { TEST_UPLOAD_DIR } from "../setup/env.js";

describe("storage adapter", () => {
  it("resolves UPLOAD_DIR from the environment", () => {
    expect(UPLOAD_ROOT).toBe(path.resolve(TEST_UPLOAD_DIR()));
    expect(path.isAbsolute(UPLOAD_ROOT)).toBe(true);
  });

  it("saves images with random names and the extension of their type", async () => {
    const png = await saveImage(pngBuffer(), "image/png");
    expect(png.filename).toMatch(/^[a-f0-9]{32}\.png$/);
    expect(png.url).toBe(`/uploads/${png.filename}`);
    expect(png.size).toBe(pngBuffer().length);
    expect(png.mimeType).toBe("image/png");
    const onDisk = await readFile(path.join(UPLOAD_ROOT, png.filename));
    expect(onDisk.equals(pngBuffer())).toBe(true);

    const jpg = await saveImage(jpegBuffer(), "image/jpeg");
    expect(jpg.filename).toMatch(/\.jpg$/);
    const webp = await storage.saveImage(webpBuffer(), "image/webp");
    expect(webp.filename).toMatch(/\.webp$/);
    expect(new Set([png.filename, jpg.filename, webp.filename]).size).toBe(3);

    for (const f of [png, jpg, webp]) expect(await deleteImage(f.filename)).toBe(true);
  });

  it("refuses unsupported types and empty buffers", async () => {
    await expect(saveImage(pngBuffer(), "image/gif")).rejects.toThrow(RangeError);
    await expect(saveImage(Buffer.alloc(0), "image/png")).rejects.toThrow(RangeError);
    expect(() => extensionFor("text/plain")).toThrow(RangeError);
    expect(extensionFor("image/jpeg")).toBe(".jpg");
  });

  it("deletes stored images and reports missing ones as false", async () => {
    const saved = await saveImage(pngBuffer(), "image/png");
    expect(await deleteImage(saved.filename)).toBe(true);
    expect(await deleteImage(saved.filename)).toBe(false);
    await expect(stat(path.join(UPLOAD_ROOT, saved.filename))).rejects.toMatchObject({ code: "ENOENT" });
    expect(await deleteImage(null)).toBe(false);
    expect(await deleteImage(undefined)).toBe(false);
  });

  it.each([
    "../package.json",
    "..\\package.json",
    "/etc/passwd",
    "C:\\Windows\\win.ini",
    "0123456789abcdef0123456789abcdef.png/../../x.png",
    "0123456789abcdef0123456789abcdef.exe",
    "0123456789abcdef0123456789abcdef.png\u0000.txt",
    ".hidden.png",
    "abc.png",
    "",
    "0123456789ABCDEF0123456789ABCDEF.PNG",
  ])("never resolves or deletes an unsafe name: %j", async (name) => {
    expect(isSafeFilename(name)).toBe(false);
    expect(resolveUploadPath(name)).toBeNull();
    expect(await deleteImage(name)).toBe(false);
  });

  it("resolves safe names inside the upload directory only", () => {
    const name = "0123456789abcdef0123456789abcdef.webp";
    expect(isSafeFilename(name)).toBe(true);
    expect(resolveUploadPath(name)).toBe(path.join(UPLOAD_ROOT, name));
    expect(resolveUploadPath(name)?.startsWith(UPLOAD_ROOT + path.sep)).toBe(true);
    expect(publicUrl(name)).toBe(`/uploads/${name}`);
    expect(isSafeFilename(42)).toBe(false);
  });
});
