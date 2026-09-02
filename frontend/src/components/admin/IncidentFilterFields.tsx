import { ChipToggleGroup, type ChipOption } from "@/components/ui/ChipToggleGroup";
import { Field, Fieldset } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import {
  NEUTRAL_COLOR,
  PRIORITY_COLORS,
  RISK_COLORS,
  SEVERITY_COLORS,
  SOURCE_COLORS,
  STATUS_COLORS,
} from "@/constants/colors";
import {
  PRIORITIES,
  PRIORITY_UNASSIGNED,
  PRIORITY_UNASSIGNED_LABEL,
  RISK_LEVELS,
  RISK_NONE,
  RISK_NONE_LABEL,
  SEVERITIES,
  SOURCES,
  STATUSES,
  type PriorityFilterValue,
  type RiskFilterValue,
} from "@/constants/enums";
import type { IncidentFilterValues } from "@/features/admin/incidentListParams";
import { useMeta } from "@/meta/useMeta";

export interface IncidentFilterFieldsProps {
  value: IncidentFilterValues;
  onChange: (next: IncidentFilterValues) => void;
}

/** The facet controls of the incident list (every value from docs/api.md 6.3, including the sentinels). */
export function IncidentFilterFields({ value, onChange }: IncidentFilterFieldsProps) {
  const meta = useMeta();
  const update = <K extends keyof IncidentFilterValues>(key: K, next: IncidentFilterValues[K]) =>
    onChange({ ...value, [key]: next });

  const statusOptions = STATUSES.map((s) => ({
    value: s,
    label: meta.label("status", s),
    color: STATUS_COLORS[s],
  }));
  const categoryOptions = meta.categories.map((c) => ({ value: c.key, label: c.label, color: c.color }));
  const priorityOptions: ChipOption<PriorityFilterValue>[] = [
    ...PRIORITIES.map((p) => ({ value: p, label: meta.label("priority", p), color: PRIORITY_COLORS[p] })),
    { value: PRIORITY_UNASSIGNED, label: PRIORITY_UNASSIGNED_LABEL, color: NEUTRAL_COLOR },
  ];
  const severityOptions = SEVERITIES.map((s) => ({
    value: s,
    label: meta.label("severity", s),
    color: SEVERITY_COLORS[s],
  }));
  const riskOptions: ChipOption<RiskFilterValue>[] = [
    ...RISK_LEVELS.map((r) => ({ value: r, label: meta.label("riskLevel", r), color: RISK_COLORS[r] })),
    { value: RISK_NONE, label: RISK_NONE_LABEL, color: NEUTRAL_COLOR },
  ];
  const sourceOptions = SOURCES.map((s) => ({
    value: s,
    label: meta.label("source", s),
    color: SOURCE_COLORS[s],
  }));

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Fieldset legend="Status">
        <ChipToggleGroup
          label="Status"
          size="sm"
          options={statusOptions}
          value={value.status}
          onChange={(next) => update("status", next)}
        />
      </Fieldset>
      <Fieldset legend="Category">
        <ChipToggleGroup
          label="Category"
          size="sm"
          options={categoryOptions}
          value={value.category}
          onChange={(next) => update("category", next)}
        />
      </Fieldset>
      <Fieldset legend="Priority">
        <ChipToggleGroup
          label="Priority"
          size="sm"
          options={priorityOptions}
          value={value.priority}
          onChange={(next) => update("priority", next)}
        />
      </Fieldset>
      <Fieldset legend="Severity">
        <ChipToggleGroup
          label="Severity"
          size="sm"
          options={severityOptions}
          value={value.severity}
          onChange={(next) => update("severity", next)}
        />
      </Fieldset>
      <Fieldset legend="Risk level" description="Estimated from historical data; not every incident has one.">
        <ChipToggleGroup
          label="Risk level"
          size="sm"
          options={riskOptions}
          value={value.riskLevel}
          onChange={(next) => update("riskLevel", next)}
        />
      </Fieldset>
      <Fieldset legend="Source">
        <ChipToggleGroup
          label="Source"
          size="sm"
          options={sourceOptions}
          value={value.source}
          onChange={(next) => update("source", next)}
        />
      </Fieldset>
      <Fieldset legend="Reported between" className="lg:col-span-2">
        <div className="grid max-w-md grid-cols-2 gap-3">
          <Field label="From">
            <Input
              type="date"
              inputSize="sm"
              value={value.from}
              max={value.to || undefined}
              onChange={(e) => update("from", e.target.value)}
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              inputSize="sm"
              value={value.to}
              min={value.from || undefined}
              onChange={(e) => update("to", e.target.value)}
            />
          </Field>
        </div>
      </Fieldset>
    </div>
  );
}
