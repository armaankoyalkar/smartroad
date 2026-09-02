/// <reference types="vite/client" />
/// <reference types="leaflet.markercluster" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_TILE_URL?: string;
  readonly VITE_TILE_ATTRIBUTION?: string;
  readonly VITE_GEOCODE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
