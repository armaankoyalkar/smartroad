import { X } from "lucide-react";
import { IncidentPopup } from "@/components/map/IncidentPopup";
import { IconButton } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Card";
import type { MapFeature } from "@/types/api";

export interface SelectedIncidentPanelProps {
  feature: MapFeature;
  detailsHref: string | null;
  onClose: () => void;
}

/** Desktop side card with the same content as the marker popup (keyboard users get a focusable panel). */
export function SelectedIncidentPanel({ feature, detailsHref, onClose }: SelectedIncidentPanelProps) {
  return (
    <Panel
      strong
      padding="sm"
      role="region"
      aria-label="Selected incident"
      className="pointer-events-auto w-72 animate-slide-down shadow-pop"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Selected incident</p>
        <IconButton
          label="Close selected incident"
          size="xs"
          icon={<X className="h-3.5 w-3.5" aria-hidden="true" />}
          onClick={onClose}
          className="-mr-1 -mt-1"
        />
      </div>
      <div className="mt-1 [&>div]:w-full">
        <IncidentPopup feature={feature} detailsHref={detailsHref} />
      </div>
    </Panel>
  );
}
