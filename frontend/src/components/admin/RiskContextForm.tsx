import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { RISK_FEATURE_NAMES, type RiskFeatureName } from "@/constants/enums";
import { featureLabel, featureValueLabel, orderedFeatureSpecs } from "@/features/admin/riskFeatures";
import { useMeta } from "@/meta/useMeta";
import type { FeatureSpec, RiskFeatures } from "@/types/api";
import { riskFeaturesSchema } from "@/utils/validation";

export type RiskOverrides = Partial<RiskFeatures>;

export interface RiskContextFormProps {
  value: RiskOverrides;
  onApply: (overrides: RiskOverrides) => void;
  specs?: readonly FeatureSpec[];
  disabled?: boolean;
}

type Draft = Partial<Record<RiskFeatureName, string>>;

const partialSchema = riskFeaturesSchema.partial();

function toDraft(value: RiskOverrides): Draft {
  const draft: Draft = {};
  for (const name of RISK_FEATURE_NAMES) {
    const v = value[name];
    if (v !== undefined) draft[name] = String(v);
  }
  return draft;
}

/**
 * Override any of the ten features for one incident's estimate (query parameters of
 * GET /api/ml/incidents/:id/risk). Empty fields keep the value derived from the incident.
 * Nothing here is stored.
 */
export function RiskContextForm({ value, onApply, specs, disabled = false }: RiskContextFormProps) {
  const meta = useMeta();
  const id = useId();
  const [draft, setDraft] = useState<Draft>(() => toDraft(value));
  const [errors, setErrors] = useState<Partial<Record<RiskFeatureName, string>>>({});
  const ordered = orderedFeatureSpecs(specs);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = partialSchema.safeParse(Object.fromEntries(Object.entries(draft).filter(([, v]) => v !== "")));
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as RiskFeatureName;
        if (!next[field]) next[field] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    const overrides: RiskOverrides = {};
    for (const name of RISK_FEATURE_NAMES) {
      const v = parsed.data[name];
      if (v !== undefined) (overrides as Record<string, unknown>)[name] = v;
    }
    onApply(overrides);
  };

  const optionsFor = (spec: FeatureSpec): { value: string; label: string }[] => {
    if (spec.name === "category") return meta.categories.map((c) => ({ value: c.key, label: c.label }));
    return (spec.values ?? []).map((v) => ({ value: v, label: featureValueLabel(spec.name, v) }));
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate aria-label="Adjust estimate context">
      <p className="text-xs text-muted">
        Leave a field empty to keep the value derived from the incident. Overrides are used for this estimate
        only and are not stored.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((spec) => {
          const name = spec.name as RiskFeatureName;
          const fieldId = `${id}-${name}`;
          const label = featureLabel(name, specs);
          const current = draft[name] ?? "";
          if (spec.type === "categorical") {
            return (
              <Field key={name} label={label} id={fieldId} error={errors[name]}>
                <Select
                  selectSize="sm"
                  value={current}
                  placeholder="Derived from incident"
                  options={optionsFor(spec)}
                  disabled={disabled}
                  onChange={(event) => setDraft((d) => ({ ...d, [name]: event.target.value }))}
                />
              </Field>
            );
          }
          return (
            <Field
              key={name}
              label={label}
              id={fieldId}
              error={errors[name]}
              hint={
                spec.min !== undefined && spec.max !== undefined ? `${spec.min} to ${spec.max}` : undefined
              }
            >
              <Input
                inputSize="sm"
                type="number"
                inputMode="numeric"
                min={spec.min}
                max={spec.max}
                step={1}
                placeholder="Derived"
                value={current}
                disabled={disabled}
                onChange={(event) => setDraft((d) => ({ ...d, [name]: event.target.value }))}
              />
            </Field>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => {
            setDraft({});
            setErrors({});
            onApply({});
          }}
        >
          Clear overrides
        </Button>
        <Button type="submit" size="sm" variant="secondary" disabled={disabled}>
          Apply context
        </Button>
      </div>
    </form>
  );
}
