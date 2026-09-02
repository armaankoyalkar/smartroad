import { Card, CardHeader } from "@/components/ui/Card";
import { RISK_LEVELS, type RiskLevel } from "@/constants/enums";
import { useMeta } from "@/meta/useMeta";
import type { ModelMetrics } from "@/types/api";
import { formatMetric, formatNumber, formatPercent } from "@/utils/format";

export interface MetricsTableProps {
  metrics: ModelMetrics;
  classes?: readonly RiskLevel[];
  className?: string;
}

/** Overall and per-class metrics of the shipped model on the test split. */
export function MetricsTable({ metrics, classes = RISK_LEVELS, className }: MetricsTableProps) {
  const meta = useMeta();
  const support = classes.reduce((sum, c) => sum + (metrics.perClass[c]?.support ?? 0), 0);
  return (
    <Card className={className}>
      <CardHeader title="Metrics" description="Held-out test split of the training run." as="h2" />
      <dl className="grid grid-cols-3 gap-3">
        {[
          { label: "Accuracy", value: metrics.accuracy },
          { label: "Macro F1", value: metrics.macroF1 },
          { label: "Weighted F1", value: metrics.weightedF1 },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-navy-600 bg-navy-900/50 px-3 py-2">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-faint">{item.label}</dt>
            <dd className="tabular text-lg font-semibold text-text">
              {formatMetric(item.value)}
              <span className="ml-1 text-xs font-normal text-muted">({formatPercent(item.value, 1)})</span>
            </dd>
          </div>
        ))}
      </dl>
      <div className="scrollbar-thin mt-4 overflow-x-auto">
        <table className="w-full min-w-[26rem] text-sm">
          <caption className="sr-only">Per-class precision, recall, F1 and support</caption>
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-faint">
              <th scope="col" className="py-1.5 pr-3 font-semibold">
                Class
              </th>
              <th scope="col" className="py-1.5 pr-3 text-right font-semibold">
                Precision
              </th>
              <th scope="col" className="py-1.5 pr-3 text-right font-semibold">
                Recall
              </th>
              <th scope="col" className="py-1.5 pr-3 text-right font-semibold">
                F1
              </th>
              <th scope="col" className="py-1.5 text-right font-semibold">
                Support
              </th>
            </tr>
          </thead>
          <tbody>
            {classes.map((level) => {
              const row = metrics.perClass[level];
              return (
                <tr key={level} className="border-t border-navy-600/60">
                  <th scope="row" className="py-1.5 pr-3 text-left font-medium text-text">
                    {meta.label("riskLevel", level)}
                  </th>
                  <td className="tabular py-1.5 pr-3 text-right text-text">{formatMetric(row?.precision)}</td>
                  <td className="tabular py-1.5 pr-3 text-right text-text">{formatMetric(row?.recall)}</td>
                  <td className="tabular py-1.5 pr-3 text-right text-text">{formatMetric(row?.f1)}</td>
                  <td className="tabular py-1.5 text-right text-muted">{formatNumber(row?.support)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-navy-600">
              <th scope="row" className="py-1.5 pr-3 text-left font-semibold text-text">
                Total support
              </th>
              <td colSpan={3} />
              <td className="tabular py-1.5 text-right font-semibold text-text">{formatNumber(support)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
