import { History } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { NEUTRAL_COLOR, PRIORITY_COLORS, STATUS_COLORS } from "@/constants/colors";
import { useMeta } from "@/meta/useMeta";
import type { MetaContextValue } from "@/meta/context";
import type { StatusHistoryEntry } from "@/types/api";
import { cn } from "@/utils/cn";
import { formatDateTime, formatRelative } from "@/utils/format";

export interface StatusTimelineProps {
  entries: readonly StatusHistoryEntry[];
  className?: string;
}

function describeEntry(entry: StatusHistoryEntry, meta: MetaContextValue): { title: string; color: string } {
  if (entry.field === "priority") {
    if (!entry.to) return { title: "Priority cleared", color: NEUTRAL_COLOR };
    return {
      title: `Priority set to ${meta.label("priority", entry.to)}`,
      color: (PRIORITY_COLORS as Record<string, string>)[entry.to] ?? NEUTRAL_COLOR,
    };
  }
  const to = entry.to ?? "";
  const color = (STATUS_COLORS as Record<string, string>)[to] ?? NEUTRAL_COLOR;
  if (entry.from === null) return { title: `Report submitted (${meta.label("status", to)})`, color };
  return { title: `Status changed to ${meta.label("status", to)}`, color };
}

/**
 * Vertical history of status and priority changes (oldest first, latest highlighted).
 * Notes are shown whenever the API included them; the reporter always sees admin notes.
 */
export function StatusTimeline({ entries, className }: StatusTimelineProps) {
  const meta = useMeta();
  if (entries.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={History}
        title="No history yet"
        description="Changes made by administrators will appear here."
        className={className}
      />
    );
  }
  const ordered = [...entries].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <ol className={cn("relative space-y-0", className)} aria-label="Status history">
      {ordered.map((entry, index) => {
        const { title, color } = describeEntry(entry, meta);
        const latest = index === ordered.length - 1;
        return (
          <li key={`${entry.field}-${entry.at}-${index}`} className="relative flex gap-4 pb-6 last:pb-0">
            {!latest && (
              <span aria-hidden="true" className="absolute left-[7px] top-4 h-full w-px bg-navy-600" />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "relative mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-navy-900",
                latest && "ring-2 ring-cyan-400/50",
              )}
              style={{ backgroundColor: color }}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-medium text-text">{title}</p>
                {latest && (
                  <span className="rounded border border-cyan-400/40 bg-cyan-400/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                    Latest
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                <time dateTime={entry.at}>{formatDateTime(entry.at)}</time> · {formatRelative(entry.at)}
                {entry.changedBy?.name && <> · by {entry.changedBy.name}</>}
              </p>
              {entry.note && (
                <p className="rounded-md border border-navy-600 bg-navy-900/60 px-3 py-2 text-sm text-text">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">Note </span>
                  {entry.note}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
