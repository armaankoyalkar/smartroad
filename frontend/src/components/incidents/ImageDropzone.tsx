import { useEffect, useId, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { ImagePlus, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { config } from "@/config";
import { cn } from "@/utils/cn";
import {
  createPreviewUrl,
  describeAcceptedTypes,
  revokePreviewUrl,
  validateImageFile,
  type UploadLimitsLike,
} from "@/utils/files";
import { formatBytes } from "@/utils/format";

export interface ImageDropzoneProps {
  /** The newly chosen file (null when none). */
  value: File | null;
  onChange: (file: File | null) => void;
  /** Absolute URL of the image already stored on the server (edit mode). */
  existingUrl?: string | null;
  /** Edit mode: the stored image was marked for removal. */
  existingRemoved?: boolean;
  onExistingRemovedChange?: (removed: boolean) => void;
  limits?: UploadLimitsLike;
  /** Validation error from the form (shown under the zone). */
  error?: ReactNode;
  disabled?: boolean;
  id?: string;
  label?: ReactNode;
}

/**
 * Single-image picker: click or drag-and-drop, immediate type/size check against the API limits,
 * preview, remove, and (in edit mode) replace or remove the stored image.
 */
export function ImageDropzone({
  value,
  onChange,
  existingUrl = null,
  existingRemoved = false,
  onExistingRemovedChange,
  limits = config.defaultUpload,
  error,
  disabled = false,
  id: idProp,
  label = "Photo",
}: ImageDropzoneProps) {
  const generated = useId();
  const id = idProp ?? `image${generated}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [rejection, setRejection] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const previewUrl = useMemo(() => (value ? createPreviewUrl(value) : null), [value]);
  useEffect(() => () => revokePreviewUrl(previewUrl), [previewUrl]);

  const accept = limits.mimeTypes.join(",");
  const accepted = describeAcceptedTypes(limits.mimeTypes);
  const maxLabel = formatBytes(limits.maxBytes);

  const pick = (file: File | undefined) => {
    if (!file || disabled) return;
    const check = validateImageFile(file, limits);
    if (!check.ok) {
      setRejection(check.reason);
      onChange(null);
      return;
    }
    setRejection(null);
    onChange(file);
    onExistingRemovedChange?.(false);
  };

  const clear = () => {
    setRejection(null);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files?.[0]);
  };

  const message = error ?? rejection;
  const showExisting = !!existingUrl && !value && !existingRemoved;
  const describedBy = [hintId, message ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label} <span className="ml-1.5 text-xs font-normal text-muted">(optional)</span>
      </label>

      {previewUrl && value ? (
        <Preview src={previewUrl} caption={`${value.name} · ${formatBytes(value.size)}`}>
          <Button size="sm" variant="outline" disabled={disabled} onClick={() => inputRef.current?.click()}>
            Choose another
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={clear}
            leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Remove
          </Button>
        </Preview>
      ) : showExisting ? (
        <Preview src={existingUrl} caption="Current photo">
          <Button size="sm" variant="outline" disabled={disabled} onClick={() => inputRef.current?.click()}>
            Replace
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={disabled}
            onClick={() => onExistingRemovedChange?.(true)}
            leftIcon={<Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Remove photo
          </Button>
        </Preview>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center transition-colors duration-150",
            dragging ? "border-cyan-400 bg-cyan-400/10" : "border-navy-500 bg-navy-900/40",
            message && "border-danger/70",
            disabled && "opacity-60",
          )}
        >
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-navy-600 bg-navy-800 text-cyan-300"
          >
            {dragging ? <UploadCloud className="h-5 w-5" /> : <ImagePlus className="h-5 w-5" />}
          </span>
          <p className="text-sm text-text">
            Drag a photo here, or{" "}
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="font-medium text-cyan-300 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              browse your files
            </button>
          </p>
          {existingUrl && existingRemoved && (
            <Button
              size="xs"
              variant="ghost"
              disabled={disabled}
              onClick={() => onExistingRemovedChange?.(false)}
              leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Keep the current photo
            </Button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        aria-describedby={describedBy || undefined}
        aria-invalid={message ? true : undefined}
        onChange={(event) => pick(event.target.files?.[0])}
        className="sr-only"
      />

      <p id={hintId} className="text-xs text-muted">
        One {accepted} image up to {maxLabel}. Please do not upload photos of people or number plates.
      </p>
      {message && (
        <p id={errorId} role="alert" className="text-xs text-red-300">
          {message}
        </p>
      )}
    </div>
  );
}

function Preview({ src, caption, children }: { src: string; caption: string; children: ReactNode }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-navy-600 bg-navy-900/60">
      <img src={src} alt="Selected photo preview" className="max-h-64 w-full object-contain" />
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-navy-600 px-3 py-2 text-xs text-muted">
        <span className="min-w-0 truncate">{caption}</span>
        <span className="flex items-center gap-1">{children}</span>
      </figcaption>
    </figure>
  );
}
