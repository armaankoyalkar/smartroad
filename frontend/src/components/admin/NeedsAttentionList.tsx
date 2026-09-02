import { ArrowUpRight, Inbox } from "lucide-react";
import { Link } from "react-router";
import { useAdminIncidents } from "@/api/queries";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { CategoryBadge, SeverityBadge, SourceBadge } from "@/components/ui/SemanticBadges";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatRelative, pluralize } from "@/utils/format";

const LIMIT = 5;

/** The newest SUBMITTED incidents (five rows) so an administrator sees what needs review first. */
export function NeedsAttentionList() {
  const query = useAdminIncidents({ status: ["SUBMITTED"], limit: LIMIT, sort: "-createdAt" });
  const rows = query.data?.data ?? [];
  const total = query.data?.meta.total;

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Needs attention"
        description={
          typeof total === "number"
            ? `${pluralize(total, "submitted report")} waiting for review.`
            : "Newest submitted reports waiting for review."
        }
        actions={
          <LinkButton
            to="/admin/incidents?status=SUBMITTED"
            size="xs"
            variant="ghost"
            rightIcon={<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            View all
          </LinkButton>
        }
      />
      {query.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: LIMIT }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : query.error ? (
        <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          size="sm"
          icon={Inbox}
          title="Nothing waiting for review"
          description="New reports appear here as soon as citizens submit them."
        />
      ) : (
        <ul className="divide-y divide-navy-600/60">
          {rows.map((incident) => (
            <li key={incident.id} className="flex items-start gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <Link
                  to={`/admin/incidents/${incident.id}`}
                  className="block truncate text-sm font-medium text-text hover:text-cyan-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                >
                  {incident.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <CategoryBadge category={incident.category} size="sm" />
                  <SeverityBadge severity={incident.severity} size="sm" />
                  {incident.source === "seed" && <SourceBadge source="seed" size="sm" />}
                </div>
              </div>
              <time dateTime={incident.createdAt} className="shrink-0 text-xs text-muted">
                {formatRelative(incident.createdAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
