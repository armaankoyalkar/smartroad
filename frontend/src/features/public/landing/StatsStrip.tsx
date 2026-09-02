import { usePublicStats } from "@/api/queries";
import { formatNumber, formatRelative } from "@/utils/format";

/**
 * Public figures from GET /api/analytics/public. Renders nothing while loading or on error so no
 * placeholder number is ever shown; zeros are shown as zeros with an honest caption (FR-D5).
 */
export function StatsStrip() {
  const stats = usePublicStats();
  if (stats.isPending) return null;
  if (stats.isError || !stats.data) {
    return (
      <p className="text-center text-sm text-muted" role="status">
        Public figures are unavailable right now (the server could not be reached).{" "}
        <button type="button" className="underline hover:text-text" onClick={() => void stats.refetch()}>
          Retry
        </button>
      </p>
    );
  }
  const d = stats.data;
  const items = [
    { label: "Reports filed", value: d.reportsFiled },
    { label: "Reports resolved", value: d.reportsResolved },
    { label: "Filed in the last 30 days", value: d.reportsLast30Days },
    { label: "Resolved in the last 30 days", value: d.resolvedLast30Days },
  ];
  const allZero = items.every((item) => item.value === 0);

  return (
    <section aria-labelledby="stats-title" className="border-y border-navy-600 bg-navy-900/60">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <h2 id="stats-title" className="sr-only">
          Public statistics
        </h2>
        <dl className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="space-y-1">
              <dd className="tabular text-3xl font-semibold tracking-tight text-text sm:text-4xl">
                {formatNumber(item.value)}
              </dd>
              <dt className="text-sm text-muted">{item.label}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-faint">
          {allZero ? "No citizen reports have been filed yet: " : ""}
          Real reports only, demo data excluded; rejected reports are not counted. Figures generated{" "}
          <time dateTime={d.generatedAt}>{formatRelative(d.generatedAt)}</time>.
        </p>
      </div>
    </section>
  );
}
