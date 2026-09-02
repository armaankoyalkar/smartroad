import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { BRAND } from "@/constants/colors";
import type { ModelComparisonRow } from "@/types/api";
import { cn } from "@/utils/cn";
import { formatMetric } from "@/utils/format";

export interface ModelComparisonTableProps {
  comparison: readonly ModelComparisonRow[];
  /** Name of the shipped model, highlighted in the table. */
  shippedModel: string;
  className?: string;
}

/** Baselines and candidates trained in the same run, next to the shipped model. */
export function ModelComparisonTable({ comparison, shippedModel, className }: ModelComparisonTableProps) {
  const rows = [...comparison].sort((a, b) => b.macroF1 - a.macroF1);
  return (
    <Card className={className}>
      <CardHeader
        title="Model comparison"
        description="Every candidate was trained and evaluated on the same splits."
        as="h2"
      />
      {rows.length === 0 ? (
        <p className="text-sm text-muted">The training run recorded no comparison.</p>
      ) : (
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[22rem] text-sm">
            <caption className="sr-only">Accuracy and macro F1 per candidate model</caption>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-faint">
                <th scope="col" className="py-1.5 pr-3 font-semibold">
                  Model
                </th>
                <th scope="col" className="py-1.5 pr-3 text-right font-semibold">
                  Accuracy
                </th>
                <th scope="col" className="py-1.5 text-right font-semibold">
                  Macro F1
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const shipped = row.model === shippedModel;
                return (
                  <tr
                    key={row.model}
                    className={cn("border-t border-navy-600/60", shipped && "bg-cyan-400/5")}
                  >
                    <th scope="row" className="py-1.5 pr-3 text-left font-medium text-text">
                      <span className="inline-flex flex-wrap items-center gap-2">
                        {row.model}
                        {shipped && (
                          <Badge size="sm" color={BRAND.accent} dot={false}>
                            shipped
                          </Badge>
                        )}
                      </span>
                    </th>
                    <td className="tabular py-1.5 pr-3 text-right text-text">{formatMetric(row.accuracy)}</td>
                    <td className="tabular py-1.5 text-right text-text">{formatMetric(row.macroF1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
