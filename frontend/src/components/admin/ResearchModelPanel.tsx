import { FlaskConical } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Card, CardHeader } from "@/components/ui/Card";
import { featureLabel } from "@/features/admin/riskFeatures";
import type { ResearchModel } from "@/types/api";
import { formatMetric } from "@/utils/format";

/** The research variant trained on more features than SmartRoad collects; never the model behind the form. */
export function ResearchModelPanel({ research, className }: { research: ResearchModel; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader title="Research variant" description="For the report only." as="h2" />
      <Alert tone="info" icon={FlaskConical} title="Not the shipped model">
        This variant is trained on features the product does not collect, so it is reported for comparison and
        never used for the estimates shown in SmartRoad.
      </Alert>
      <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-faint">Accuracy</dt>
          <dd className="tabular text-text">{formatMetric(research.metrics.accuracy)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-faint">Macro F1</dt>
          <dd className="tabular text-text">{formatMetric(research.metrics.macroF1)}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-faint">
            Features ({research.features.length})
          </dt>
          <dd className="mt-1 flex flex-wrap gap-1.5">
            {research.features.map((feature) => (
              <code
                key={feature}
                className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-muted"
              >
                {featureLabel(feature)}
              </code>
            ))}
          </dd>
        </div>
      </dl>
      {research.note && <p className="mt-3 text-xs text-muted">{research.note}</p>}
    </Card>
  );
}
