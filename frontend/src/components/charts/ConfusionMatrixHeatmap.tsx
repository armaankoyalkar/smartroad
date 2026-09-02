import { BRAND } from "@/constants/colors";
import { useMeta } from "@/meta/useMeta";
import type { ConfusionMatrix } from "@/types/api";
import { cn } from "@/utils/cn";
import { formatNumber, formatPercent } from "@/utils/format";
import { matrixMax, share } from "./chartHelpers";

export interface ConfusionMatrixHeatmapProps {
  matrix: ConfusionMatrix;
  className?: string;
}

/**
 * Confusion matrix of the shipped model on the held-out test split: rows are the true class,
 * columns the estimated class. A colour scale highlights large cells; every cell prints its count
 * and its share of the row so the colour is never the only carrier.
 */
export function ConfusionMatrixHeatmap({ matrix, className }: ConfusionMatrixHeatmapProps) {
  const meta = useMeta();
  const { labels, matrix: cells } = matrix;
  const max = matrixMax(cells);
  const rowTotals = cells.map((row) => row.reduce((sum, v) => sum + v, 0));
  const grandTotal = rowTotals.reduce((sum, v) => sum + v, 0);

  if (labels.length === 0 || cells.length === 0 || grandTotal === 0) {
    return <p className={cn("text-sm text-muted", className)}>The confusion matrix is empty.</p>;
  }

  return (
    <div className={cn("scrollbar-thin overflow-x-auto", className)}>
      <table className="w-full min-w-[22rem] border-separate border-spacing-1 text-xs">
        <caption className="sr-only">
          Confusion matrix: rows are the true risk level, columns the estimated risk level.
        </caption>
        <thead>
          <tr>
            <td className="p-1" />
            <th
              scope="colgroup"
              colSpan={labels.length}
              className="pb-1 text-center font-semibold text-muted"
            >
              Estimated level
            </th>
            <td className="p-1" />
          </tr>
          <tr>
            <th scope="col" className="p-1 text-left font-semibold text-muted">
              True level
            </th>
            {labels.map((label) => (
              <th key={label} scope="col" className="p-1 text-center font-semibold text-text">
                {meta.label("riskLevel", label)}
              </th>
            ))}
            <th scope="col" className="p-1 text-right font-semibold text-muted">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {cells.map((row, r) => (
            <tr key={labels[r] ?? r}>
              <th scope="row" className="p-1 text-left font-medium text-text">
                {meta.label("riskLevel", labels[r] ?? String(r))}
              </th>
              {row.map((value, c) => {
                const intensity = max > 0 ? value / max : 0;
                const diagonal = r === c;
                return (
                  <td
                    key={c}
                    className={cn(
                      "tabular rounded-md p-2 text-center align-middle",
                      diagonal ? "ring-1 ring-inset ring-cyan-400/50" : "",
                    )}
                    style={{
                      backgroundColor: `color-mix(in srgb, ${BRAND.accent} ${Math.round(8 + intensity * 72)}%, ${BRAND.surface})`,
                    }}
                  >
                    <span className="block text-sm font-semibold text-text">{formatNumber(value)}</span>
                    <span className="block text-[11px] text-muted">
                      {formatPercent(share(value, rowTotals[r] ?? 0), 0)} of row
                    </span>
                  </td>
                );
              })}
              <td className="tabular p-1 text-right text-muted">{formatNumber(rowTotals[r])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-faint">
        Diagonal cells (outlined) are correct estimates. Counts are from the held-out test split of the
        training run.
      </p>
    </div>
  );
}
