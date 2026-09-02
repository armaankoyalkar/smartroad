import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { apiAssetUrl } from "@/config";
import type { IncidentImage, UploadLimits } from "@/types/api";
import { createPreviewUrl, describeAcceptedTypes, revokePreviewUrl, validateImageFile } from "@/utils/files";
import { formatBytes } from "@/utils/format";

export interface AdminEditImageFieldProps {
  current: IncidentImage | null;
  file: File | null;
  onFileChange: (file: File | null) => void;
  removeCurrent: boolean;
  onRemoveCurrentChange: (remove: boolean) => void;
  limits: UploadLimits;
  disabled?: boolean;
  error?: string;
  idPrefix: string;
}

/** Replace or remove the incident image. The server re-checks type (magic bytes) and size. */
export function AdminEditImageField({
  current,
  file,
  onFileChange,
  removeCurrent,
  onRemoveCurrentChange,
  limits,
  disabled = false,
  error,
  idPrefix,
}: AdminEditImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Object URLs are created in the change handler; this only releases the previous one.
  useEffect(() => () => revokePreviewUrl(preview), [preview]);

  const pick = (chosen: File | null) => {
    setLocalError(null);
    if (!chosen) {
      onFileChange(null);
      setPreview(null);
      return;
    }
    const check = validateImageFile(chosen, limits);
    if (!check.ok) {
      setLocalError(check.reason);
      onFileChange(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    onFileChange(chosen);
    setPreview(createPreviewUrl(chosen));
  };

  const currentUrl = apiAssetUrl(current?.url);
  const showCurrent = current && !file && !removeCurrent && currentUrl;

  return (
    <Field
      label="Image"
      id={`${idPrefix}-image`}
      showOptional
      error={error ?? localError ?? undefined}
      hint={`${describeAcceptedTypes(limits.mimeTypes)}, at most ${formatBytes(limits.maxBytes)}.`}
    >
      <div className="space-y-3">
        {showCurrent && (
          <img
            src={currentUrl}
            alt="Current incident image"
            className="max-h-48 rounded-lg border border-navy-600 object-cover"
          />
        )}
        {preview && file && (
          <img
            src={preview}
            alt={`New image: ${file.name}`}
            className="max-h-48 rounded-lg border border-cyan-400/40 object-cover"
          />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            id={`${idPrefix}-image`}
            type="file"
            accept={limits.mimeTypes.join(",")}
            className="sr-only"
            disabled={disabled}
            onChange={(event) => pick(event.target.files?.[0] ?? null)}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            leftIcon={<ImagePlus className="h-4 w-4" aria-hidden="true" />}
          >
            {current ? "Replace image" : "Add image"}
          </Button>
          {file && (
            <Button
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => {
                pick(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              leftIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            >
              Discard new image
            </Button>
          )}
        </div>
        {current && !file && (
          <Checkbox
            id={`${idPrefix}-remove-image`}
            label="Remove the current image"
            description="The file is deleted from the server when you save."
            checked={removeCurrent}
            disabled={disabled}
            onChange={(event) => onRemoveCurrentChange(event.target.checked)}
          />
        )}
      </div>
    </Field>
  );
}
