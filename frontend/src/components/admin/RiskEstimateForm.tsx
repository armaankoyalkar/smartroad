import { useId, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Activity, RotateCcw } from "lucide-react";
import { useForm } from "react-hook-form";
import { useEstimateRisk } from "@/api/mutations";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, FormError } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { RISK_FEATURE_NAMES, type RiskFeatureName } from "@/constants/enums";
import { featureValueLabel, orderedFeatureSpecs, riskFormDefaults } from "@/features/admin/riskFeatures";
import { useMeta } from "@/meta/useMeta";
import type { FeatureSpec, RiskEstimate } from "@/types/api";
import { applyServerErrors } from "@/utils/formErrors";
import {
  riskFeaturesSchema,
  type RiskFeaturesFormInput,
  type RiskFeaturesFormValues,
} from "@/utils/validation";
import { MlNotice } from "./MlStates";
import { RiskResultCard } from "./RiskResultCard";

export interface RiskEstimateFormProps {
  specs: readonly FeatureSpec[];
  className?: string;
}

const SERVER_FIELD_MAP = Object.fromEntries(RISK_FEATURE_NAMES.map((n) => [`features.${n}`, n]));

/** Inputs generated from the model's feature schema; POST /api/ml/estimate-risk on submit. */
export function RiskEstimateForm({ specs, className }: RiskEstimateFormProps) {
  const meta = useMeta();
  const id = useId();
  const mutation = useEstimateRisk();
  const [result, setResult] = useState<RiskEstimate | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const ordered = orderedFeatureSpecs(specs);

  const form = useForm<RiskFeaturesFormInput, unknown, RiskFeaturesFormValues>({
    resolver: zodResolver(riskFeaturesSchema),
    defaultValues: riskFormDefaults(),
  });
  const { register, handleSubmit, reset, setError, formState } = form;

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      setResult(await mutation.mutateAsync(values));
    } catch (error) {
      setResult(null);
      setFormError(applyServerErrors(error, setError, { fieldMap: SERVER_FIELD_MAP }));
    }
  });

  const optionsFor = (spec: FeatureSpec) =>
    spec.name === "category"
      ? meta.categories.map((c) => ({ value: c.key, label: c.label }))
      : (spec.values ?? []).map((v) => ({ value: v, label: featureValueLabel(spec.name, v) }));

  return (
    <Card className={className}>
      <CardHeader
        title="Try an estimate"
        description="Type a context and ask the shipped model for a risk level. Nothing is stored."
        as="h2"
      />
      <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {ordered.map((spec) => {
            const name = spec.name as RiskFeatureName;
            const error = formState.errors[name]?.message;
            const fieldId = `${id}-${name}`;
            if (spec.type === "categorical") {
              return (
                <Field key={name} label={spec.label} id={fieldId} required error={error}>
                  <Select
                    selectSize="sm"
                    options={optionsFor(spec)}
                    {...register(name)}
                    disabled={mutation.isPending}
                  />
                </Field>
              );
            }
            return (
              <Field
                key={name}
                label={spec.label}
                id={fieldId}
                required
                error={error}
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
                  {...register(name)}
                  disabled={mutation.isPending}
                />
              </Field>
            );
          })}
        </div>
        <FormError message={mutation.error && !formError ? null : formError} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={mutation.isPending}
            onClick={() => {
              reset(riskFormDefaults());
              setResult(null);
              setFormError(null);
            }}
            leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Reset
          </Button>
          <Button
            type="submit"
            size="sm"
            loading={mutation.isPending}
            loadingText="Estimating"
            leftIcon={<Activity className="h-4 w-4" aria-hidden="true" />}
          >
            Estimate risk
          </Button>
        </div>
      </form>
      {mutation.error && !formError && <MlNotice error={mutation.error} className="mt-4" />}
      {result && (
        <div className="mt-5 border-t border-navy-600 pt-4">
          <RiskResultCard estimate={result} specs={specs} />
        </div>
      )}
    </Card>
  );
}
