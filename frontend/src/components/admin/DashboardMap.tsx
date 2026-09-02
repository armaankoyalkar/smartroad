import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useHotspots, useMapIncidents } from "@/api/queries";
import { HotspotLayer } from "@/components/map/HotspotLayer";
import { IncidentMarkers } from "@/components/map/IncidentMarkers";
import { Legend } from "@/components/map/Legend";
import { MapCanvas } from "@/components/map/MapCanvas";
import { MapStatusBar } from "@/components/map/MapStatusBar";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";

const MAP_LIMIT = 1000;

/**
 * Compact dashboard map: the newest 1000 incidents coloured by category with an optional
 * hotspot layer. Loaded lazily by the dashboard so the Leaflet bundle stays out of its chunk.
 */
export default function DashboardMap() {
  const [hotspotsOn, setHotspotsOn] = useState(false);
  const incidents = useMapIncidents({ limit: MAP_LIMIT });
  const hotspots = useHotspots({}, hotspotsOn);
  const features = incidents.data?.data.features ?? [];

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Incident map"
        description="Newest reports across the city, coloured by category."
        actions={
          <>
            <Switch
              size="sm"
              checked={hotspotsOn}
              onChange={setHotspotsOn}
              label="Hotspots"
              labelFirst
              disabled={incidents.isLoading}
            />
            <LinkButton
              to="/admin/map"
              size="xs"
              variant="ghost"
              rightIcon={<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Open map
            </LinkButton>
          </>
        }
      />
      {incidents.isLoading ? (
        <Skeleton className="h-80 w-full rounded-card" />
      ) : (
        <MapCanvas height={320} ariaLabel="Incident map" scrollWheelZoom={false}>
          <IncidentMarkers
            features={features}
            colorMode="category"
            mutedIds={hotspotsOn ? hotspots.data?.data.noiseIds : undefined}
            detailsHref={(feature) => `/admin/incidents/${feature.properties.id}`}
          />
          {hotspotsOn && hotspots.data && (
            <HotspotLayer clusters={hotspots.data.data.clusters} noiseIds={hotspots.data.data.noiseIds} />
          )}
        </MapCanvas>
      )}
      <div className="mt-3 space-y-2">
        <MapStatusBar
          count={incidents.data?.meta.count}
          truncated={incidents.data?.meta.truncated}
          limit={MAP_LIMIT}
          seedCount={incidents.data?.meta.seedCount}
          isLoading={incidents.isLoading}
          isFetching={incidents.isFetching && !incidents.isLoading}
          error={incidents.error}
          onRetry={() => void incidents.refetch()}
          hotspots={{
            enabled: hotspotsOn,
            isLoading: hotspots.isLoading,
            error: hotspots.error,
            clusterCount: hotspots.data?.data.clusters.length,
            totalPoints: hotspots.data?.data.totalPoints,
          }}
        />
        <Legend mode="category" horizontal bare className="px-1" />
      </div>
    </Card>
  );
}
