import { MapPinOff } from "lucide-react";
import { useMapIncidents } from "@/api/queries";
import { IncidentMarkers } from "@/components/map/IncidentMarkers";
import { Legend } from "@/components/map/Legend";
import { MapCanvas } from "@/components/map/MapCanvas";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatNumber, pluralize } from "@/utils/format";

export const PREVIEW_LIMIT = 200;
const HEIGHT = 380;

/**
 * Read-only preview of the newest public incidents (GET /api/map/incidents?limit=200) with the
 * category colours served by the API. When the API is unreachable a calm placeholder replaces
 * the map; markers are never invented. Loaded lazily so the landing page stays light.
 */
export function MapPreview() {
  const query = useMapIncidents({ limit: PREVIEW_LIMIT });

  if (query.isPending) {
    return (
      <Skeleton className="w-full rounded-card" style={{ height: HEIGHT }} aria-label="Loading map preview" />
    );
  }
  if (query.isError || !query.data) {
    return (
      <Card className="flex items-center justify-center" style={{ minHeight: HEIGHT }}>
        <EmptyState
          icon={MapPinOff}
          title="The map preview is unavailable right now"
          description="The SmartRoad API could not be reached, so no incidents can be shown. The full map page will work again once the server answers."
          action={
            <Button variant="outline" onClick={() => void query.refetch()}>
              Try again
            </Button>
          }
        />
      </Card>
    );
  }

  const { features } = query.data.data;
  const { count, seedCount, truncated } = query.data.meta;

  if (features.length === 0) {
    return (
      <Card className="flex items-center justify-center" style={{ minHeight: HEIGHT }}>
        <EmptyState
          icon={MapPinOff}
          title="No incidents to show yet"
          description="The map fills in as citizens report incidents. Nothing is shown here that is not in the database."
        />
      </Card>
    );
  }

  return (
    <figure className="space-y-3">
      <MapCanvas height={HEIGHT} interactive={false} ariaLabel="Preview map of the latest reported incidents">
        <IncidentMarkers features={features} colorMode="category" showPopups={false} radius={6} />
      </MapCanvas>
      <Legend mode="category" horizontal bare title="Marker colour by category (from the API)" />
      <figcaption className="text-xs text-muted">
        Showing the {truncated ? `newest ${formatNumber(PREVIEW_LIMIT)} of the` : ""}{" "}
        {pluralize(count, "reported incident")} visible to the public; rejected reports are never shown.
        {seedCount > 0 && (
          <> Includes demo data ({formatNumber(seedCount)} seed records labelled in the app).</>
        )}
      </figcaption>
    </figure>
  );
}
