import { useCallback, useMemo, useState } from "react";
import { useHotspots, useMapIncidents } from "@/api/queries";
import { useAuth } from "@/auth/useAuth";
import type { MapViewport } from "@/components/map/MapCanvas";
import {
  hotspotParamsFromFilters,
  mapFiltersToParams,
  parseMapFilters,
  serializeMapFilters,
  type MapFilterValues,
} from "@/components/map/mapFilterState";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { useQueryParams } from "@/hooks/useQueryParams";
import type { MapFeature } from "@/types/api";

/** Newest incidents fetched per request; beyond this the API reports `truncated` and the page adds a bbox. */
export const PUBLIC_MAP_LIMIT = 2000;
const VIEWPORT_DEBOUNCE_MS = 400;

/**
 * State of the public map page. Filters (and the admin hotspot toggle) live in the URL so a
 * filtered map can be shared; the viewport bbox is only sent once the API has reported truncation.
 */
export function useMapPageState() {
  const { isAdmin, isAuthenticated } = useAuth();
  const query = useQueryParams();
  const filters = useMemo(
    () => parseMapFilters(query.searchParams, { isAdmin }),
    [query.searchParams, isAdmin],
  );
  const hotspotsOn = isAdmin && query.getBoolean("hotspots", false);

  const [viewport, setViewport] = useState<MapViewport | null>(null);
  const [truncatedOnce, setTruncatedOnce] = useState(false);
  const bbox = truncatedOnce && viewport ? viewport.bbox : null;

  const params = useMemo(
    () => mapFiltersToParams(filters, { isAdmin, bbox, limit: PUBLIC_MAP_LIMIT }),
    [filters, isAdmin, bbox],
  );
  const incidents = useMapIncidents(params);
  // Once the API says more incidents matched than the limit, follow the viewport (FR-G6).
  if (incidents.data?.meta.truncated && !truncatedOnce) setTruncatedOnce(true);

  const hotspotParams = useMemo(() => hotspotParamsFromFilters(filters), [filters]);
  const hotspots = useHotspots(hotspotParams, hotspotsOn);

  const onViewportChange = useDebouncedCallback(
    (next: MapViewport) => setViewport(next),
    VIEWPORT_DEBOUNCE_MS,
  );

  const setFilters = useCallback(
    (next: MapFilterValues) => query.setMany(serializeMapFilters(next)),
    [query],
  );
  const setHotspotsOn = useCallback((on: boolean) => query.setOne("hotspots", on ? "1" : undefined), [query]);

  const detailsHref = useCallback(
    (feature: MapFeature): string | null => {
      if (!isAuthenticated) return null;
      return isAdmin ? `/admin/incidents/${feature.properties.id}` : `/app/reports/${feature.properties.id}`;
    },
    [isAuthenticated, isAdmin],
  );

  return {
    isAdmin,
    isAuthenticated,
    filters,
    setFilters,
    hotspotsOn,
    setHotspotsOn,
    incidents,
    hotspots,
    onViewportChange,
    truncatedOnce,
    limit: PUBLIC_MAP_LIMIT,
    detailsHref,
  };
}

export type MapPageState = ReturnType<typeof useMapPageState>;
