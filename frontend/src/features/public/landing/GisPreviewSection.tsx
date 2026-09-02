import { lazy, Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Section } from "./Section";

const MapPreview = lazy(() => import("./MapPreview").then((m) => ({ default: m.MapPreview })));

/** Map preview plus an honest description of the GIS, hotspot and risk parts. */
export function GisPreviewSection() {
  return (
    <Section
      id="gis"
      eyebrow="GIS and risk"
      title="See where incidents are reported"
      description="The public map shows every non-rejected report, coloured by category. Administrators can additionally switch on DBSCAN hotspot clusters and colour markers by the stored risk estimate."
      className="bg-navy-900/40"
    >
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <Suspense
          fallback={<Skeleton className="h-96 w-full rounded-card" aria-label="Loading map preview" />}
        >
          <MapPreview />
        </Suspense>
        <div className="space-y-5 text-sm text-muted">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-text">Base map, not a traffic feed</h3>
            <p>
              Tiles come from OpenStreetMap and only draw the streets. Every marker is an incident record from
              the SmartRoad database, so what you see is what was reported.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-text">Hotspots are clusters of reports</h3>
            <p>
              DBSCAN groups reports that lie within a chosen distance of each other and marks isolated ones as
              noise. The circles show where reports concentrate; they are not produced by the risk model.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-text">
              Risk levels are estimates from historical data
            </h3>
            <p>
              The Random Forest classifier was trained on a documented historical dataset and reports its
              metrics next to every estimate. It says how serious an incident under given conditions tends to
              be; it does not say that an incident will happen.
            </p>
          </div>
          <LinkButton
            to="/map"
            variant="outline"
            rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
          >
            Open the full map
          </LinkButton>
        </div>
      </div>
    </Section>
  );
}
