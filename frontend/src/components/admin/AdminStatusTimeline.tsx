import { Flag, History, UserRound } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PriorityBadge, StatusBadge } from "@/components/ui/SemanticBadges";
import type { StatusHistoryEntry } from "@/types/api";
import { cn } from "@/utils/cn";
import { formatDateTime } from "@/utils/format";

export interface AdminStatusTimelineProps {
  history: readonly StatusHistoryEntry[];
  className?: string;
}

function Value({ entry, value }: { entry: StatusHistoryEntry; value: string | null }) {
  if (value === null) return <span className="text-xs text-muted">unassigned</span>;
  return entry.field === "priority" ? (
    <PriorityBadge priority={value} size="sm" />
  ) : (
    <StatusBadge status={value} size="sm" />
  );
}

/** Full status and priority history with actor names and notes (admins see every note). */
export function AdminStatusTimeline({ history, className }: AdminStatusTimelineProps) {
  const entries = [...history].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return (
    <Card className={className}>
      <CardHeader title="History" description="Most recent first." as="h2" />
      {entries.length === 0 ? (
        <EmptyState size="sm" icon={History} title="No history yet" />
      ) : (
        <ol className="relative space-y-4 border-l border-navy-600 pl-5">
          {entries.map((entry, index) => {
            const Icon = entry.field === "priority" ? Flag : History;
            return (
              <li key={`${entry.at}-${index}`} className="relative">
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -left-[1.6rem] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border bg-navy-800",
                    index === 0 ? "border-cyan-400/60 text-cyan-300" : "border-navy-600 text-muted",
                  )}
                >
                  <Icon className="h-3 w-3" />
                </span>
                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="text-muted">{entry.field === "priority" ? "Priority" : "Status"}</span>
                  {entry.from !== null && (
                    <>
                      <Value entry={entry} value={entry.from} />
                      <span className="text-faint" aria-hidden="true">
                        →
                      </span>
                    </>
                  )}
                  {entry.from === null && entry.field === "priority" && (
                    <>
                      <Value entry={entry} value={null} />
                      <span className="text-faint" aria-hidden="true">
                        →
                      </span>
                    </>
                  )}
                  <Value entry={entry} value={entry.to} />
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <UserRound className="h-3 w-3" aria-hidden="true" />
                    {entry.changedBy ? entry.changedBy.name : "Reporter"}
                  </span>
                  <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
                </p>
                {entry.note && (
                  <blockquote className="mt-1.5 rounded-md border border-navy-600 bg-navy-900/60 px-3 py-2 text-sm text-text">
                    {entry.note}
                  </blockquote>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
