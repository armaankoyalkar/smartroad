import {
  PriorityBadge,
  SeverityBadge,
  SourceBadge,
  StatusBadge,
  VerificationBadge,
} from "@/components/ui/SemanticBadges";
import type { Incident } from "@/types/api";
import { cn } from "@/utils/cn";

export interface IncidentBadgesProps {
  incident: Pick<Incident, "status" | "verification" | "severity" | "priority" | "source">;
  size?: "sm" | "md";
  showVerification?: boolean;
  showPriority?: boolean;
  showSeverity?: boolean;
  className?: string;
}

/** The standard badge row: status, verification, severity, priority ("Unassigned") and "Demo data" for seed records. */
export function IncidentBadges({
  incident,
  size = "md",
  showVerification = true,
  showPriority = true,
  showSeverity = true,
  className,
}: IncidentBadgesProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <StatusBadge status={incident.status} size={size} />
      {showVerification && <VerificationBadge verification={incident.verification} size={size} />}
      {showSeverity && <SeverityBadge severity={incident.severity} size={size} />}
      {showPriority && <PriorityBadge priority={incident.priority} size={size} />}
      {incident.source === "seed" && <SourceBadge source={incident.source} size={size} />}
    </div>
  );
}
