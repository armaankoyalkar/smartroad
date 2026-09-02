/**
 * Reusable, page-agnostic map components (react-leaflet 5). Import from "@/components/map".
 * The map bundle is heavy: pages should load it with React.lazy (see LazyMap.tsx).
 */
export { CoordinateInputs, type CoordinateInputsProps } from "./CoordinateInputs";
export { HotspotLayer, type HotspotLayerProps } from "./HotspotLayer";
export { IncidentMarkers, type IncidentMarkersProps } from "./IncidentMarkers";
export { IncidentPopup, type IncidentPopupProps } from "./IncidentPopup";
export { Legend, type LegendProps } from "./Legend";
export { LocationPicker, type LocationPickerProps, type LocationSource } from "./LocationPicker";
export { MapCanvas, type LatLng, type MapCanvasProps, type MapViewport } from "./MapCanvas";
export { MapFilters, type MapFiltersProps } from "./MapFilters";
export { MapStatusBar, type HotspotStatus, type MapStatusBarProps } from "./MapStatusBar";
export { MiniMap, type MiniMapProps } from "./MiniMap";
export * from "./mapColors";
export * from "./mapFilterState";
