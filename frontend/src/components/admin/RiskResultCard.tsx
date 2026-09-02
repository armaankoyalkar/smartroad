import type { ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { ProbabilityBars } from "@/components/charts/ProbabilityBars";
import { Alert } from "@/components/ui/Alert";
import { RiskBadge } from "@/components/ui/SemanticBadges";
import { featureLabel, featureValueLabel } from "@/features/admin/riskFeatures";
import type { FeatureSpec, RiskEstimate } from "@/types/api";
import { cn } from "@/utils/cn";
import { formatDateTime, formatMetric } from "@/utils/format";

export interface RiskResultCardProps {
  estimate: RiskEstimate;
  specs?: readonly FeatureSpec[];
  /** When the estimate was computed (stored estimates carry it). */
  estimatedAt?: string | null;
  /** Extra content between the factors and the disclaimer (for example the feature vector used). */
  children?: ReactNode;
  className?: string;
}

/**
 * One risk estimate: level, class probabilities, contributing factors (a local sensitivity
 * measure, not SHAP), the model version, the demo-model notice and the API disclaimer.
 */
export function RiskResultCard({ estimate, specs, estimatedAt, children, className }: RiskResultCardProps) {
  const factors = [...estimate.contributions].sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect));
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <RiskBadge level={estimate.riskLevel} demo={estimate.isDemoModel} size="md" variant="solid" />
        <p className="text-xs text-muted">
          Estimate from historical data · model {estimate.modelVersion}
          {estimatedAt && ` · ${formatDateTime(estimatedAt)}`}
        </p>
      </div>

      <ProbabilityBars probabilities={estimate.probabilities} predicted={estimate.riskLevel} />

      <section aria-labelledby="risk-factors-heading" className="space-y-2">
        <h3 id="risk-factors-heading" className="text-sm font-semibold text-text">
          Contributing factors (sensitivity)
        </h3>
        {factors.length === 0 ? (
          <p className="text-xs text-muted">The service returned no factor breakdown for this estimate.</p>
        ) : (
          <ul className="divide-y divide-navy-600/60 rounded-lg border border-navy-600 text-xs">
            {factors.map((factor) => (
              <li key={factor.feature} className="flex items-center gap-3 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="text-text">{featureLabel(factor.feature, specs)}</span>
                  <span className="ml-1.5 text-muted">{featureValueLabel(factor.feature, factor.value)}</span>
                </span>
                <span
                  className={cn(
                    "tabular shrink-0 font-medium",
                    factor.effect > 0 ? "text-amber-300" : factor.effect < 0 ? "text-cyan-300" : "text-muted",
                  )}
                  title="Change in the probability of the estimated level when this feature is replaced by its training-set baseline"
                >
                  {factor.effect > 0 ? "+" : ""}
                  {formatMetric(factor.effect, 3)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-faint">
          Positive values pushed the estimate towards the estimated level; each value is the change in
          probability when that feature is replaced by its training-set baseline.
        </p>
      </section>

      {children}

      {estimate.isDemoModel && (
        <Alert tone="warning" icon={FlaskConical} title="Demo model">
          This model was trained on the generated demo dataset, so its estimates illustrate the workflow
          rather than real road conditions.
        </Alert>
      )}
      <p className="text-xs italic text-muted">{estimate.disclaimer}</p>
    </div>
  );
}
