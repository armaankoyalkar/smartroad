import { RISK_COLORS } from "@/constants/colors";
import { RISK_LEVELS, type RiskLevel } from "@/constants/enums";
import { useMeta } from "@/meta/useMeta";
import type { RiskProbabilities } from "@/types/api";
import { cn } from "@/utils/cn";
import { formatPercent } from "@/utils/format";

export interface ProbabilityBarsProps {
  probabilities: RiskProbabilities;
  /** The class the model picked; its bar is emphasised and marked in text. */
  predicted?: RiskLevel | null;
  className?: string;
}

/** Class probabilities of a risk estimate as three labelled bars (text carries the value). */
export function ProbabilityBars({ probabilities, predicted = null, className }: ProbabilityBarsProps) {
  const meta = useMeta();
  return (
    <ul className={cn("space-y-2", className)} aria-label="Class probabilities">
      {RISK_LEVELS.map((level) => {
        const value = probabilities[level] ?? 0;
        const isPredicted = level === predicted;
        return (
          <li key={level} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className={cn(isPredicted ? "font-semibold text-text" : "text-muted")}>
                {meta.label("riskLevel", level)}
                {isPredicted && <span className="ml-1.5 text-[11px] text-cyan-300">(estimated level)</span>}
              </span>
              <span className="tabular text-text">{formatPercent(value, 1)}</span>
            </div>
            <div
              role="meter"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(value * 100)}
              aria-label={`${meta.label("riskLevel", level)} probability`}
              className="h-2 w-full overflow-hidden rounded-full bg-navy-900/80"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300",
                  !isPredicted && "opacity-70",
                )}
                style={{
                  width: `${Math.min(100, Math.max(0, value * 100))}%`,
                  backgroundColor: RISK_COLORS[level],
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
