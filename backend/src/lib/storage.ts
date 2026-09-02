import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { isUploadMimeType, type UploadMimeType } from "../config/enums.js";

/**
 * Local-disk image storage. Files are written under UPLOAD_DIR with random
 * names and served by app.ts at /uploads/:filename. Nothing here ever
 * resolves a path outside UPLOAD_DIR: the filename pattern is strict and the
 * resolved path is checked against the root.
 *
 * The functions are grouped in `storage` so a different backend (object
 * storage) can replace the adapter without touching the incident service.
 */

export interface StoredImage {
  filename: string;
  url: string;
  size: number;
  mimeType: UploadMimeType;
}

export interface ImageStorage {
  saveImage(buffer: Buffer, mimeType: string): Promise<StoredImage>;
  deleteImage(filename: string | null | undefined): Promise<boolean>;
}

const EXTENSIONS: Readonly<Record<UploadMimeType, string>> = Object.freeze({
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
});

/** Random hex names with one of the three image extensions; nothing else is ever served or deleted. */
const SAFE_FILENAME = /^[a-f0-9]{16,64}\.(jpg|jpeg|png|webp)$/;

export const UPLOAD_ROOT = path.resolve(process.cwd(), env.UPLOAD_DIR);

export function extensionFor(mimeType: string): string {
  if (!isUploadMimeType(mimeType)) throw new RangeError(`Unsupported image type: ${mimeType}`);
  return EXTENSIONS[mimeType];
}

export function isSafeFilename(name: unknown): name is string {
  return typeof name === "string" && SAFE_FILENAME.test(name) && path.basename(name) === name;
}

/** The public path stored in incident.image.url; the frontend prefixes the API origin. */
export function publicUrl(filename: string): string {
  return `/uploads/${filename}`;
}

/**
 * Absolute path of an upload, or null when the name is not one we could have
 * generated or would escape the upload directory.
 */
export function resolveUploadPath(filename: unknown): string | null {
  if (!isSafeFilename(filename)) return null;
  const resolved = path.resolve(UPLOAD_ROOT, filename);
  if (!resolved.startsWith(UPLOAD_ROOT + path.sep)) return null;
  return resolved;
}

let ensured: Promise<void> | null = null;

/** Create UPLOAD_DIR if needed. Called at start-up and lazily before the first write. */
export function ensureUploadDir(): Promise<void> {
  if (!ensured) {
    ensured = mkdir(UPLOAD_ROOT, { recursive: true }).then(() => undefined);
    ensured.catch(() => {
      ensured = null; // let a later call retry after a transient failure
    });
  }
  return ensured;
}

export async function saveImage(buffer: Buffer, mimeType: string): Promise<StoredImage> {
  if (!isUploadMimeType(mimeType)) throw new RangeError(`Unsupported image type: ${mimeType}`);
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new RangeError("Empty image buffer");
  await ensureUploadDir();
  const filename = `${randomBytes(16).toString("hex")}${EXTENSIONS[mimeType]}`;
  const target = resolveUploadPath(filename);
  if (!target) throw new Error("Generated an unexpected filename"); // cannot happen; keeps the guarantee explicit
  await writeFile(target, buffer, { flag: "wx" });
  return { filename, url: publicUrl(filename), size: buffer.length, mimeType };
}

/**
 * Delete a stored image. Returns true when a file was removed. Unsafe names
 * and missing files return false; nothing is thrown so callers can delete
 * best-effort while removing an incident.
 */
export async function deleteImage(filename: string | null | undefined): Promise<boolean> {
  const target = resolveUploadPath(filename);
  if (!target) return false;
  try {
    await unlink(target);
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw err;
  }
}

export const storage: ImageStorage = { saveImage, deleteImage };
