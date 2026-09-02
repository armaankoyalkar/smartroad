import { lazy, Suspense, useMemo, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { useHotspots, useMapIncidents } from "@/api/queries";
import { HotspotList } from "@/components/admin/HotspotList";
import { HotspotParamsPanel } from "@/components/admin/HotspotParamsPanel";
import { MethodNote } from "@/components/admin/MethodNote";
import { MapFilters } from "@/components/map/MapFilters";
import {
  hotspotParamsFromFilters,
  mapFiltersToParams,
  parseMapFilters,
  serializeMapFilters,
  type MapFilterValues,
} from "@/components/map/mapFilterState";
import { MapStatusBar } from "@/components/map/MapStatusBar";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { Switch } from "@/components/ui/Switch";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import {
  parseHotspotParams,
  serializeHotspotParams,
  type HotspotParamValues,
} from "@/features/admin/hotspotParams";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useQueryParams } from "@/hooks/useQueryParams";
import type { HotspotCluster } from "@/types/api";

const AdminMapCanvas = lazy(() => import("@/components/admin/AdminMapCanvas"));
const MAP_LIMIT = 5000;
const TABS_ID = "admin-map-side";
type SideTab = "filters" | "hotspots";

export default function AdminMapPage() {
  useDocumentTitle("Map & hotspots");
  const qp = useQueryParams();
  const filters = useMemo(() => parseMapFilters(qp.searchParams, { isAdmin: true }), [qp.searchParams]);
  const hotspotParams = useMemo(() => parseHotspotParams(qp.searchParams), [qp.searchParams]);
  const showHotspots = qp.getBoolean("hotspots", true);
  const [tab, setTab] = useState<SideTab>("hotspots");
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  const incidents = useMapIncidents(mapFiltersToParams(filters, { isAdmin: true, limit: MAP_LIMIT }));
  const hotspots = useHotspots(hotspotParamsFromFilters(filters, hotspotParams), showHotspots);
  const features = incidents.data?.data.features ?? [];
  const clusters = hotspots.data?.data.clusters ?? [];
  const noiseIds = hotspots.data?.data.noiseIds ?? [];

  const setFilters = (next: MapFilterValues) => qp.setMany(serializeMapFilters(next), { resetPage: false });
  const commitHotspotParams = (next: HotspotParamValues) => {
    qp.setMany(serializeHotspotParams(next), { resetPage: false });
    if (hotspotParams.eps === next.eps && hotspotParams.minSamples === next.minSamples)
      void hotspots.refetch();
  };
  const flyTo = (cluster: HotspotCluster) => {
    setSelectedCluster(cluster.id);
    mapRef.current?.flyTo(
      [cluster.centroid.latitude, cluster.centroid.longitude],
      Math.max(mapRef.current.getZoom(), 15),
      {
        duration: 0.8,
      },
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Operations"
        title="Map & hotspots"
        description="Every incident on the map, with density clusters of reported incidents computed on request."
        actions={
          <Switch
            checked={showHotspots}
            onChange={(checked) => qp.setOne("hotspots", checked ? undefined : "false", { resetPage: false })}
            label="Show hotspots"
            labelFirst
            size="sm"
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Card padding="sm" className="lg:max-h-[calc(100dvh-11rem)] lg:overflow-y-auto scrollbar-thin">
          <Tabs<SideTab>
            id={TABS_ID}
            aria-label="Map controls"
            variant="pills"
            size="sm"
            items={[
              { value: "hotspots", label: "Hotspots", count: showHotspots ? clusters.length : undefined },
              { value: "filters", label: "Filters" },
            ]}
            value={tab}
            onChange={setTab}
            className="mb-4"
          />
          <TabPanel tabsId={TABS_ID} value="hotspots" activeValue={tab}>
            <div className="space-y-4">
              <MethodNote />
              <HotspotParamsPanel
                key={`${hotspotParams.eps}-${hotspotParams.minSamples}`}
                values={hotspotParams}
                onCommit={commitHotspotParams}
                filters={filters}
                onFiltersChange={setFilters}
                isComputing={showHotspots && hotspots.isFetching}
              />
            </div>
          </TabPanel>
          <TabPanel tabsId={TABS_ID} value="filters" activeValue={tab}>
            <MapFilters value={filters} onChange={setFilters} isAdmin />
          </TabPanel>
        </Card>

        <div className="flex min-h-[60vh] flex-col gap-2 lg:h-[calc(100dvh-11rem)]">
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
              enabled: showHotspots,
              isLoading: hotspots.isLoading,
              error: hotspots.error,
              clusterCount: hotspots.data?.data.clusters.length,
              totalPoints: hotspots.data?.data.totalPoints,
            }}
          />
          <div className="min-h-0 flex-1">
            <Suspense fallback={<Skeleton className="h-full min-h-[50vh] w-full rounded-card" />}>
              <AdminMapCanvas
                features={features}
                colorMode={filters.colorMode}
                clusters={clusters}
                noiseIds={noiseIds}
                showHotspots={showHotspots && !!hotspots.data}
                selectedClusterId={selectedCluster}
                onClusterSelect={flyTo}
                onReady={(map) => {
                  mapRef.current = map;
                }}
              />
            </Suspense>
          </div>
        </div>
      </div>

      {showHotspots && (
        <Card>
          <CardHeader
            title="Hotspot clusters"
            description="Select a cluster to fly the map to it. Counts are reported incidents inside the cluster."
            as="h2"
          />
          <HotspotList
            clusters={clusters}
            noiseCount={noiseIds.length}
            totalPoints={hotspots.data?.data.totalPoints ?? 0}
            meta={hotspots.data?.meta}
            selectedId={selectedCluster}
            onSelect={flyTo}
            isLoading={hotspots.isLoading}
            error={hotspots.error}
            onRetry={() => void hotspots.refetch()}
          />
        </Card>
      )}
    </div>
  );
}
