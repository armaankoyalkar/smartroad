import { useId, useState, type FormEvent } from "react";
import { RotateCcw, Sparkles } from "lucide-react";
import type { MapFilterValues } from "@/components/map/mapFilterState";
import { Button } from "@/components/ui/Button";
import { ChipToggleGroup } from "@/components/ui/ChipToggleGroup";
import { Field, Fieldset } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import {
  DEFAULT_HOTSPOT_PARAMS,
  draftFromValues,
  HOTSPOT_LIMITS,
  validateHotspotDraft,
  type HotspotDraft,
  type HotspotDraftErrors,
  type HotspotParamValues,
} from "@/features/admin/hotspotParams";
import { useMeta } from "@/meta/useMeta";

export interface HotspotParamsPanelProps {
  values: HotspotParamValues;
  onCommit: (values: HotspotParamValues) => void;
  /** Shared map filters: the category and date range also feed the hotspot request. */
  filters: MapFilterValues;
  onFiltersChange: (next: MapFilterValues) => void;
  defaults?: HotspotParamValues;
  isComputing?: boolean;
}

/**
 * DBSCAN parameters (eps in metres, minimum points) edited as a draft and applied with
 * "Recompute"; the category and date range are shared with the marker filters so noise points
 * match the loaded markers.
 */
export function HotspotParamsPanel({
  values,
  onCommit,
  filters,
  onFiltersChange,
  defaults = DEFAULT_HOTSPOT_PARAMS,
  isComputing = false,
}: HotspotParamsPanelProps) {
  const meta = useMeta();
  const id = useId();
  const [draft, setDraft] = useState<HotspotDraft>(() => draftFromValues(values));
  const [errors, setErrors] = useState<HotspotDraftErrors>({});

  const set = (key: keyof HotspotDraft, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = validateHotspotDraft(draft);
    setErrors(result.errors);
    if (result.values) onCommit(result.values);
  };

  const epsNumber = Number(draft.eps);
  const minNumber = Number(draft.minSamples);

  return (
    <form onSubmit={submit} className="space-y-4" noValidate aria-label="Hotspot parameters">
      <Field
        label="Radius (eps), metres"
        id={`${id}-eps`}
        hint={`${HOTSPOT_LIMITS.eps.min} to ${HOTSPOT_LIMITS.eps.max} m. Points closer than this are neighbours.`}
        error={errors.eps}
      >
        <div className="flex items-center gap-3">
          <input
            type="range"
            aria-label="Radius (eps) slider"
            min={HOTSPOT_LIMITS.eps.min}
            max={HOTSPOT_LIMITS.eps.max}
            step={HOTSPOT_LIMITS.eps.step}
            value={
              Number.isFinite(epsNumber)
                ? Math.min(Math.max(epsNumber, HOTSPOT_LIMITS.eps.min), HOTSPOT_LIMITS.eps.max)
                : defaults.eps
            }
            onChange={(event) => set("eps", event.target.value)}
            className="flex-1 accent-cyan-400"
          />
          <Input
            type="number"
            inputMode="numeric"
            inputSize="sm"
            className="w-24"
            min={HOTSPOT_LIMITS.eps.min}
            max={HOTSPOT_LIMITS.eps.max}
            step={1}
            value={draft.eps}
            onChange={(event) => set("eps", event.target.value)}
          />
        </div>
      </Field>
      <Field
        label="Minimum points per cluster"
        id={`${id}-min`}
        hint={`${HOTSPOT_LIMITS.minSamples.min} to ${HOTSPOT_LIMITS.minSamples.max}.`}
        error={errors.minSamples}
      >
        <div className="flex items-center gap-3">
          <input
            type="range"
            aria-label="Minimum points slider"
            min={HOTSPOT_LIMITS.minSamples.min}
            max={HOTSPOT_LIMITS.minSamples.max}
            step={HOTSPOT_LIMITS.minSamples.step}
            value={
              Number.isFinite(minNumber)
                ? Math.min(Math.max(minNumber, HOTSPOT_LIMITS.minSamples.min), HOTSPOT_LIMITS.minSamples.max)
                : defaults.minSamples
            }
            onChange={(event) => set("minSamples", event.target.value)}
            className="flex-1 accent-cyan-400"
          />
          <Input
            type="number"
            inputMode="numeric"
            inputSize="sm"
            className="w-24"
            min={HOTSPOT_LIMITS.minSamples.min}
            max={HOTSPOT_LIMITS.minSamples.max}
            step={1}
            value={draft.minSamples}
            onChange={(event) => set("minSamples", event.target.value)}
          />
        </div>
      </Field>
      <Fieldset legend="Category" description="Shared with the marker filters.">
        <ChipToggleGroup
          label="Hotspot category"
          size="sm"
          options={meta.categories.map((c) => ({ value: c.key, label: c.label, color: c.color }))}
          value={filters.category}
          onChange={(next) => onFiltersChange({ ...filters, category: next })}
        />
      </Fieldset>
      <Fieldset legend="Reported between" description="Shared with the marker filters.">
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <Input
              type="date"
              inputSize="sm"
              value={filters.from}
              max={filters.to || undefined}
              onChange={(e) => onFiltersChange({ ...filters, from: e.target.value })}
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              inputSize="sm"
              value={filters.to}
              min={filters.from || undefined}
              onChange={(e) => onFiltersChange({ ...filters, to: e.target.value })}
            />
          </Field>
        </div>
      </Fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          size="sm"
          loading={isComputing}
          loadingText="Computing"
          leftIcon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
        >
          Recompute
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setDraft(draftFromValues(defaults));
            setErrors({});
            onCommit(defaults);
          }}
          leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Defaults
        </Button>
      </div>
    </form>
  );
}
