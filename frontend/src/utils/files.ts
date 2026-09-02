import { config } from "@/config";
import { formatBytes } from "./format";

export interface UploadLimitsLike {
  maxBytes: number;
  mimeTypes: readonly string[];
}

/** Value for `<input type="file" accept>`. */
export const IMAGE_ACCEPT = config.defaultUpload.mimeTypes.join(",");

const MIME_LABELS: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

/** `JPEG, PNG or WebP`. */
export function describeAcceptedTypes(mimeTypes: readonly string[] = config.defaultUpload.mimeTypes): string {
  const labels = mimeTypes.map((m) => MIME_LABELS[m] ?? m.replace(/^image\//, "").toUpperCase());
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} or ${labels[labels.length - 1]}`;
}

export type ImageCheck = { ok: true } | { ok: false; reason: string };

/** Type and size check before upload. The server repeats both checks by content. */
export function validateImageFile(file: File, limits: UploadLimitsLike = config.defaultUpload): ImageCheck {
  if (!limits.mimeTypes.includes(file.type)) {
    return { ok: false, reason: `Image must be ${describeAcceptedTypes(limits.mimeTypes)}` };
  }
  if (file.size > limits.maxBytes) {
    return {
      ok: false,
      reason: `Image must be at most ${formatBytes(limits.maxBytes)} (this one is ${formatBytes(file.size)})`,
    };
  }
  return { ok: true };
}

/** Object URL for a local preview. Always revoke it when the preview unmounts. */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

export function revokePreviewUrl(url: string | null | undefined): void {
  if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
}
