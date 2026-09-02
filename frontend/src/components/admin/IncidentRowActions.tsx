import { ArrowRightLeft, ExternalLink, Flag } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { PRIORITIES, PRIORITY_UNASSIGNED_LABEL, type IncidentStatus, type Priority } from "@/constants/enums";
import { useMeta } from "@/meta/useMeta";
import type { Incident } from "@/types/api";
import { ActionMenu } from "./ActionMenu";

export interface IncidentRowActionsProps {
  incident: Incident;
  onStatus: (status: IncidentStatus) => void;
  onPriority: (priority: Priority | null) => void;
  busy?: boolean;
  /** Compact icon-only triggers (table cells). */
  compact?: boolean;
}

/** Open, quick status change (allowed transitions only) and priority menus for one row. */
export function IncidentRowActions({
  incident,
  onStatus,
  onPriority,
  busy = false,
  compact = true,
}: IncidentRowActionsProps) {
  const meta = useMeta();
  const transitions = meta.enums.transitions[incident.status] ?? [];

  const statusItems = transitions.map((status) => ({
    key: status,
    label: meta.label("status", status),
    tone: status === "REJECTED" ? ("danger" as const) : ("default" as const),
    onSelect: () => onStatus(status),
  }));

  const priorityItems = [
    ...PRIORITIES.map((priority) => ({
      key: priority,
      label: meta.label("priority", priority),
      current: incident.priority === priority,
      onSelect: () => onPriority(priority),
    })),
    {
      key: "none",
      label: PRIORITY_UNASSIGNED_LABEL,
      current: incident.priority === null,
      onSelect: () => onPriority(null),
    },
  ];

  return (
    <div className="flex items-center justify-end gap-1">
      <LinkButton
        to={`/admin/incidents/${incident.id}`}
        variant="ghost"
        size="sm"
        aria-label={`Open ${incident.title}`}
        leftIcon={<ExternalLink className="h-4 w-4" aria-hidden="true" />}
      >
        {compact ? <span className="sr-only">Open</span> : "Open"}
      </LinkButton>
      <ActionMenu
        label={`Change status of ${incident.title}`}
        icon={compact ? <ArrowRightLeft className="h-4 w-4" aria-hidden="true" /> : undefined}
        variant="ghost"
        items={statusItems}
        emptyMessage="No status change is allowed from here"
        loading={busy}
      />
      <ActionMenu
        label={`Set priority of ${incident.title}`}
        icon={compact ? <Flag className="h-4 w-4" aria-hidden="true" /> : undefined}
        variant="ghost"
        items={priorityItems}
        loading={busy}
      />
    </div>
  );
}
