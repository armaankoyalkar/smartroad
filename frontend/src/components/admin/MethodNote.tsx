import { Info } from "lucide-react";
import { Alert } from "@/components/ui/Alert";

export const HOTSPOT_METHOD_NOTE =
  "Hotspots are density clusters of reported incidents found with DBSCAN (haversine distance). They show where reports concentrate. They are not produced by the risk model.";

/** The one-paragraph explanation of what a hotspot is (and is not). */
export function MethodNote({ className }: { className?: string }) {
  return (
    <Alert tone="neutral" icon={Info} role="note" className={className}>
      {HOTSPOT_METHOD_NOTE}
    </Alert>
  );
}
