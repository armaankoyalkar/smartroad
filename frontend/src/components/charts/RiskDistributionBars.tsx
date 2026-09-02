import { NEUTRAL_COLOR, RISK_COLORS } from "@/constants/colors";
import { RISK_LEVELS, RISK_NONE_LABEL } from "@/constants/enums";
import { useMeta } from "@/meta/useMeta";
import type { RiskDistribution } from "@/types/api";
import { cn } from "@/utils/cn";
import { formatNumber, formatPercent } from "@/utils/format";
import { share } from "./chartHelpers";

export interface RiskDistributionBarsProps {
  distribution: RiskDistribution;
  className?: string;
}

/**
 * Stored risk estimates by level (GET /api/ml/risk/distribution) as labelled bars, plus the
 * incidents that have no estimate yet. Every number is printed next to its bar.
 */
export function RiskDistributionBars({ distribution, className }: RiskDistributionBarsProps) {
  const meta = useMeta();
  const rows = [
    ...RISK_LEVELS.map((level) => ({
      key: level,
      label: meta.label("riskLevel", level),
      value: distribution.byLevel[level] ?? 0,
      color: RISK_COLORS[level],
    })),
    { key: "NONE", label: RISK_NONE_LABEL, value: distribution.byLevel.NONE ?? 0, color: NEUTRAL_COLOR },
  ];
  const total = distribution.total > 0 ? distribution.total : rows.reduce((sum, r) => sum + r.value, 0);

  if (total === 0) {
    return (
      <p className={cn("text-sm text-muted", className)}>
        No incidents yet, so there is nothing to estimate.
      </p>
    );
  }

  return (
    <ul className={cn("space-y-2.5", className)} aria-label="Stored risk estimates by level">
      {rows.map((row) => {
        const fraction = share(row.value, total);
        return (
          <li key={row.key} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="inline-flex items-center gap-2 text-muted">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
                {row.label}
              </span>
              <span className="tabular text-text">
                {formatNumber(row.value)}
                <span className="ml-1 text-faint">({formatPercent(fraction, 0)})</span>
              </span>
            </div>
            <div
              role="meter"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={row.value}
              aria-label={`${row.label}: ${formatNumber(row.value)} of ${formatNumber(total)}`}
              className="h-2 w-full overflow-hidden rounded-full bg-navy-900/80"
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${fraction * 100}%`, backgroundColor: row.color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
