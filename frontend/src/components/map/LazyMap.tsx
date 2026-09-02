import { lazy, Suspense, type ComponentProps } from "react";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Lazy entry points for the Leaflet bundle so pages without a map never download it.
 * Usage: `<LazyMiniMap latitude={..} longitude={..} />` exactly like the eager component.
 * Pages that compose MapCanvas with layers should lazy-load their own map section instead.
 */
const MiniMapImpl = lazy(() => import("./MiniMap").then((m) => ({ default: m.MiniMap })));
const LocationPickerImpl = lazy(() =>
  import("./LocationPicker").then((m) => ({ default: m.LocationPicker })),
);

function MapFallback({ height }: { height?: number | string }) {
  return <Skeleton className="w-full rounded-card" style={{ height: height ?? 320 }} />;
}

export function LazyMiniMap(props: ComponentProps<typeof MiniMapImpl>) {
  return (
    <Suspense fallback={<MapFallback height={props.height ?? 220} />}>
      <MiniMapImpl {...props} />
    </Suspense>
  );
}

export function LazyLocationPicker(props: ComponentProps<typeof LocationPickerImpl>) {
  return (
    <Suspense fallback={<MapFallback height={props.height ?? 320} />}>
      <LocationPickerImpl {...props} />
    </Suspense>
  );
}
