import { MapPin } from "lucide-react";
import { LazyMiniMap } from "@/components/map/LazyMap";
import { Card, CardHeader } from "@/components/ui/Card";
import { useMeta } from "@/meta/useMeta";
import type { Incident } from "@/types/api";
import { formatLatLng } from "@/utils/format";

/** Small non-interactive map of the incident location with the address and coordinates. */
export function IncidentLocationCard({ incident }: { incident: Incident }) {
  const meta = useMeta();
  return (
    <Card>
      <CardHeader title="Location" as="h2" />
      <LazyMiniMap
        latitude={incident.latitude}
        longitude={incident.longitude}
        color={meta.categoryColor(incident.category)}
        height={220}
        label={`Location of ${incident.title}`}
      />
      <div className="mt-3 flex items-start gap-2 text-sm">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-text">
            {incident.address || <span className="text-muted">No address recorded</span>}
          </p>
          <p className="tabular text-xs text-muted">{formatLatLng(incident.latitude, incident.longitude)}</p>
        </div>
      </div>
    </Card>
  );
}
