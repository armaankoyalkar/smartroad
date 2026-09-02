import { lazy, Suspense, useState } from "react";
import { ListTree, SlidersHorizontal } from "lucide-react";
import { countActiveMapFilters } from "@/components/map/mapFilterState";
import { MapStatusBar } from "@/components/map/MapStatusBar";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Skeleton } from "@/components/ui/Skeleton";
import { MapSidebarContent } from "@/features/public/map/MapSidebarContent";
import { SelectedIncidentPanel } from "@/features/public/map/SelectedIncidentPanel";
import { useMapPageState } from "@/features/public/map/useMapPageState";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { MapFeature } from "@/types/api";

const MapView = lazy(() => import("@/features/public/map/MapView").then((m) => ({ default: m.MapView })));

/**
 * Public GIS page: full-height Leaflet map with clustered markers, URL-backed filters, colour
 * modes, a status bar and (for administrators) the DBSCAN hotspot layer.
 */
export default function MapPage() {
  useDocumentTitle("Incident map");
  const state = useMapPageState();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [selected, setSelected] = useState<MapFeature | null>(null);

  const features = state.incidents.data?.data.features ?? [];
  const meta = state.incidents.data?.meta;
  const selectedFeature =
    selected && features.some((f) => f.properties.id === selected.properties.id) ? selected : null;
  const activeFilters = countActiveMapFilters(state.filters);
  const hotspotData = state.hotspotsOn ? state.hotspots.data?.data : undefined;

  const sidebar = (
    <MapSidebarContent
      filters={state.filters}
      onFiltersChange={state.setFilters}
      isAdmin={state.isAdmin}
      isAuthenticated={state.isAuthenticated}
      hotspotsOn={state.hotspotsOn}
      onHotspotsChange={state.setHotspotsOn}
    />
  );

  return (
    <div className="flex h-[calc(100dvh-var(--public-nav-height))] flex-col lg:flex-row">
      <aside
        aria-label="Map filters"
        className="scrollbar-thin hidden w-80 shrink-0 overflow-y-auto border-r border-navy-600 bg-navy-950 p-4 lg:block"
      >
        <h1 className="mb-4 text-lg font-semibold text-text">Incident map</h1>
        {sidebar}
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-navy-600 bg-navy-950 px-3 py-2">
          <h1 className="text-base font-semibold text-text lg:sr-only">Incident map</h1>
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
            leftIcon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
          >
            Filters{activeFilters > 0 ? ` (${activeFilters})` : ""}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            aria-pressed={legendOpen}
            onClick={() => setLegendOpen((open) => !open)}
            leftIcon={<ListTree className="h-4 w-4" aria-hidden="true" />}
          >
            Legend
          </Button>
          <MapStatusBar
            className="min-w-0 flex-1"
            count={meta?.count}
            truncated={meta?.truncated}
            limit={state.limit}
            seedCount={meta?.seedCount}
            isLoading={state.incidents.isPending}
            isFetching={state.incidents.isFetching && !state.incidents.isPending}
            error={state.incidents.error}
            onRetry={() => void state.incidents.refetch()}
            hotspots={
              state.isAdmin
                ? {
                    enabled: state.hotspotsOn,
                    isLoading: state.hotspots.isFetching,
                    error: state.hotspots.error,
                    clusterCount: hotspotData?.clusters.length,
                    totalPoints: hotspotData?.totalPoints,
                  }
                : undefined
            }
          />
        </div>

        <div className="relative min-h-0 flex-1">
          <Suspense fallback={<Skeleton className="h-full w-full rounded-none" aria-label="Loading map" />}>
            <MapView
              features={features}
              colorMode={state.filters.colorMode}
              selectedId={selectedFeature?.properties.id ?? null}
              onSelect={setSelected}
              detailsHref={state.detailsHref}
              onViewportChange={state.onViewportChange}
              legendVisible={legendOpen}
              hotspots={
                hotspotData ? { clusters: hotspotData.clusters, noiseIds: hotspotData.noiseIds } : null
              }
            />
          </Suspense>
          {selectedFeature && (
            <div className="pointer-events-none absolute right-3 top-3 z-[500] hidden lg:block">
              <SelectedIncidentPanel
                feature={selectedFeature}
                detailsHref={state.detailsHref(selectedFeature)}
                onClose={() => setSelected(null)}
              />
            </div>
          )}
        </div>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Map filters"
        side="left"
        size="lg"
      >
        {sidebar}
      </Drawer>
    </div>
  );
}
