import { requestWithMeta } from "./client";
import { toSearchParams } from "./params";
import type {
  HotspotMeta,
  HotspotParams,
  HotspotResponse,
  MapFeatureCollection,
  MapIncidentsMeta,
  MapIncidentsParams,
  WithMeta,
} from "@/types/api";

/**
 * GET /api/map/incidents (public): GeoJSON FeatureCollection.
 * Non-admin callers never receive REJECTED incidents; `meta.truncated` tells when
 * more incidents matched than `limit`.
 */
export function getMapIncidents(
  params: MapIncidentsParams = {},
): Promise<WithMeta<MapFeatureCollection, MapIncidentsMeta>> {
  return requestWithMeta<MapFeatureCollection, MapIncidentsMeta>({
    method: "GET",
    url: "/map/incidents",
    params: toSearchParams({ ...params, bbox: params.bbox ? params.bbox.join(",") : undefined }),
  });
}

/** GET /api/map/hotspots (admin): DBSCAN clusters of reported incidents. 503 ML_UNAVAILABLE. */
export function getHotspots(params: HotspotParams = {}): Promise<WithMeta<HotspotResponse, HotspotMeta>> {
  return requestWithMeta<HotspotResponse, HotspotMeta>({
    method: "GET",
    url: "/map/hotspots",
    params: toSearchParams({ ...params }),
  });
}
