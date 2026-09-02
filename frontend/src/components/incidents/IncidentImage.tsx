import { useState } from "react";
import { ImageOff, Maximize2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiAssetUrl } from "@/config";
import type { IncidentImage as IncidentImageData } from "@/types/api";
import { cn } from "@/utils/cn";
import { formatBytes } from "@/utils/format";

export interface IncidentImageProps {
  image: IncidentImageData | null | undefined;
  /** Incident title, used for the alt text. */
  title: string;
  className?: string;
}

/** The attached photo with a full-size lightbox (Dialog). Renders a small empty state when there is none. */
export function IncidentImage({ image, title, className }: IncidentImageProps) {
  const [open, setOpen] = useState(false);
  const src = apiAssetUrl(image?.url);
  if (!image || !src) {
    return (
      <EmptyState
        size="sm"
        icon={ImageOff}
        title="No photo attached"
        description="The reporter did not add a photo to this report."
        className={className}
      />
    );
  }
  const alt = `Photo attached to the report "${title}"`;
  return (
    <figure className={cn("space-y-2", className)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View the photo at full size"
        className="group relative block w-full overflow-hidden rounded-lg border border-navy-600 bg-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
      >
        <img src={src} alt={alt} className="max-h-96 w-full object-cover" loading="lazy" />
        <span
          aria-hidden="true"
          className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-navy-950/80 px-2 py-1 text-xs text-text opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Enlarge
        </span>
      </button>
      <figcaption className="text-xs text-muted">
        {image.mimeType.replace("image/", "").toUpperCase()} · {formatBytes(image.size)} · select the photo to
        enlarge it
      </figcaption>
      <Dialog open={open} onClose={() => setOpen(false)} title="Attached photo" description={title} size="xl">
        <img
          src={src}
          alt={alt}
          className="mx-auto max-h-[70dvh] w-auto max-w-full rounded-md object-contain"
        />
      </Dialog>
    </figure>
  );
}
