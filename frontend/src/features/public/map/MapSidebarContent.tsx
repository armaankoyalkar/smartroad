import { LogIn, Radar } from "lucide-react";
import { Link, useLocation } from "react-router";
import { loginRedirect } from "@/auth/redirects";
import { MapFilters } from "@/components/map/MapFilters";
import type { MapFilterValues } from "@/components/map/mapFilterState";
import { Alert } from "@/components/ui/Alert";
import { Switch } from "@/components/ui/Switch";

export interface MapSidebarContentProps {
  filters: MapFilterValues;
  onFiltersChange: (next: MapFilterValues) => void;
  isAdmin: boolean;
  isAuthenticated: boolean;
  hotspotsOn: boolean;
  onHotspotsChange: (on: boolean) => void;
}

/** Filters, the admin hotspot toggle with its method note, and a sign-in hint for visitors. */
export function MapSidebarContent({
  filters,
  onFiltersChange,
  isAdmin,
  isAuthenticated,
  hotspotsOn,
  onHotspotsChange,
}: MapSidebarContentProps) {
  const location = useLocation();
  return (
    <div className="space-y-6">
      {isAdmin && (
        <section aria-labelledby="hotspot-toggle-title" className="surface space-y-3 p-3">
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-cyan-300" aria-hidden="true" />
            <h2 id="hotspot-toggle-title" className="text-sm font-semibold text-text">
              Hotspots
            </h2>
          </div>
          <Switch
            checked={hotspotsOn}
            onChange={onHotspotsChange}
            label="Show hotspot clusters"
            description="Default parameters (eps 200 m, at least 4 reports); adjust them on the admin map page."
          />
          <p className="text-xs text-muted">
            Hotspots are density clusters of reported incidents found with DBSCAN; they are not an output of
            the risk model.
          </p>
        </section>
      )}
      {!isAuthenticated && (
        <Alert tone="neutral" icon={LogIn}>
          <Link
            to={loginRedirect(location.pathname, location.search)}
            className="font-medium text-cyan-300 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            Sign in
          </Link>{" "}
          to open the details of an incident. Reporter identities are never shown on the map.
        </Alert>
      )}
      <MapFilters value={filters} onChange={onFiltersChange} isAdmin={isAdmin} layout="stack" />
    </div>
  );
}
