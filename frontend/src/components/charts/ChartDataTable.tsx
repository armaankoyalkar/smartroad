import { cn } from "@/utils/cn";
import { formatNumber, formatPercent } from "@/utils/format";
import { share } from "./chartHelpers";
import { sumChartData, type ChartDatum } from "./chartTypes";

export interface ChartDataTableProps {
  data: readonly ChartDatum[];
  /** Screen-reader caption (also used as the accessible name). */
  caption: string;
  valueLabel?: string;
  /** Add a share column (percentage of the total). Default true. */
  showShare?: boolean;
  /** Add a total row. Default true. */
  showTotal?: boolean;
  valueFormatter?: (value: number) => string;
  className?: string;
}

/**
 * The numbers behind a chart as a real table, so nothing depends on colour or on being able to
 * read a chart. Rendered under every domain chart (ChartCard `summary`).
 */
export function ChartDataTable({
  data,
  caption,
  valueLabel = "Count",
  showShare = true,
  showTotal = true,
  valueFormatter = (v) => formatNumber(v),
  className,
}: ChartDataTableProps) {
  const total = sumChartData(data);
  return (
    <div className={cn("scrollbar-thin overflow-x-auto", className)}>
      <table className="w-full min-w-64 text-xs">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-faint">
            <th scope="col" className="py-1 pr-3 font-semibold">
              Label
            </th>
            <th scope="col" className="py-1 pr-3 text-right font-semibold">
              {valueLabel}
            </th>
            {showShare && (
              <th scope="col" className="py-1 text-right font-semibold">
                Share
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((datum) => (
            <tr key={datum.key} className="border-t border-navy-600/60">
              <th scope="row" className="py-1 pr-3 text-left font-normal text-muted">
                <span className="inline-flex items-center gap-2">
                  {datum.color && (
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: datum.color }}
                    />
                  )}
                  {datum.label}
                </span>
              </th>
              <td className="tabular py-1 pr-3 text-right text-text">{valueFormatter(datum.value)}</td>
              {showShare && (
                <td className="tabular py-1 text-right text-muted">
                  {formatPercent(share(datum.value, total), 0)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {showTotal && (
          <tfoot>
            <tr className="border-t border-navy-600">
              <th scope="row" className="py-1 pr-3 text-left font-semibold text-text">
                Total
              </th>
              <td className="tabular py-1 pr-3 text-right font-semibold text-text">
                {valueFormatter(total)}
              </td>
              {showShare && <td className="tabular py-1 text-right text-muted">{total > 0 ? "100%" : ""}</td>}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
