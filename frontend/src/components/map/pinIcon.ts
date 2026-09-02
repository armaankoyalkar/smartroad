import L from "leaflet";

/**
 * Draggable pin for the location picker: a div icon styled by `.sr-pin` (no image assets).
 * The visually hidden text gives the marker (role=button, focusable) its accessible name.
 */
export const PIN_ICON = L.divIcon({
  className: "sr-pin",
  html: '<span class="sr-only">Selected location. Drag the marker to adjust it.</span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});
