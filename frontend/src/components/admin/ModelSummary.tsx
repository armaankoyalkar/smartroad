import { FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { BRAND } from "@/constants/colors";
import { featureValueLabel, orderedFeatureSpecs } from "@/features/admin/riskFeatures";
import type { ModelInfo } from "@/types/api";
import { formatDateTime } from "@/utils/format";

/** The shipped model: name, version, training time, the feature schema and the preprocessing steps. */
export function ModelSummary({ info, className }: { info: ModelInfo; className?: string }) {
  const specs = orderedFeatureSpecs(info.features);
  return (
    <Card className={className}>
      <CardHeader
        title="Shipped model"
        description={`${info.modelName} · version ${info.modelVersion}`}
        as="h2"
        actions={
          info.isDemoModel ? (
            <Badge color={BRAND.warning} icon={<FlaskConical className="h-3 w-3" aria-hidden="true" />}>
              Demo model
            </Badge>
          ) : undefined
        }
      />
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-faint">Trained</dt>
          <dd className="text-text">{formatDateTime(info.trainedAt)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-faint">Classes</dt>
          <dd className="text-text">{info.classes.join(", ")}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-faint">Hotspot defaults</dt>
          <dd className="tabular text-text">
            eps {info.hotspotDefaults.epsMeters} m · min {info.hotspotDefaults.minSamples} points
          </dd>
        </div>
      </dl>

      <h3 className="mt-5 text-sm font-semibold text-text">Features ({specs.length})</h3>
      <ul className="mt-2 divide-y divide-navy-600/60 rounded-lg border border-navy-600 text-xs">
        {specs.map((spec) => (
          <li key={spec.name} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2">
            <span className="font-medium text-text">{spec.label}</span>
            <code className="rounded bg-white/5 px-1 font-mono text-[11px] text-muted">{spec.name}</code>
            <span className="text-muted">
              {spec.type === "categorical"
                ? (spec.values ?? []).map((v) => featureValueLabel(spec.name, v)).join(", ") || "categorical"
                : `${spec.type}${spec.min !== undefined && spec.max !== undefined ? `, ${spec.min} to ${spec.max}` : ""}`}
            </span>
            {spec.description && <span className="basis-full text-faint">{spec.description}</span>}
          </li>
        ))}
      </ul>

      <h3 className="mt-5 text-sm font-semibold text-text">Preprocessing</h3>
      {info.preprocessing.length === 0 ? (
        <p className="mt-1 text-xs text-muted">No preprocessing steps were recorded.</p>
      ) : (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-muted">
          {info.preprocessing.map((step, index) => (
            <li key={index}>{step}</li>
          ))}
        </ol>
      )}
    </Card>
  );
}
