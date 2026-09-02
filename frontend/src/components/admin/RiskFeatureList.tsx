import { Badge } from "@/components/ui/Badge";
import { BRAND } from "@/constants/colors";
import { RISK_FEATURE_NAMES } from "@/constants/enums";
import { featureLabel, featureValueLabel } from "@/features/admin/riskFeatures";
import type { FeatureSpec, RiskFeatures } from "@/types/api";
import { cn } from "@/utils/cn";

export interface RiskFeatureListProps {
  features: RiskFeatures;
  /** Names that were defaulted rather than measured (GET /api/ml/incidents/:id/risk). */
  assumed?: readonly string[];
  specs?: readonly FeatureSpec[];
  className?: string;
}

/** The feature vector behind an estimate, with an "Assumed" chip on every defaulted value. */
export function RiskFeatureList({ features, assumed = [], specs, className }: RiskFeatureListProps) {
  const assumedSet = new Set(assumed);
  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-sm font-semibold text-text">Features used</h3>
      <dl className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
        {RISK_FEATURE_NAMES.map((name) => (
          <div
            key={name}
            className="flex items-baseline justify-between gap-2 border-b border-navy-600/50 pb-1"
          >
            <dt className="text-muted">{featureLabel(name, specs)}</dt>
            <dd className="flex items-center gap-1.5 text-right text-text">
              {featureValueLabel(name, features[name])}
              {assumedSet.has(name) && (
                <Badge size="sm" variant="outline" color={BRAND.warning} dot={false}>
                  Assumed
                </Badge>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {assumed.length > 0 && (
        <p className="text-[11px] text-faint">
          SmartRoad does not collect the assumed values; the service uses documented defaults for them. Adjust
          the context to see how the estimate changes.
        </p>
      )}
    </div>
  );
}
