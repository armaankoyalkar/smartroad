import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
import { useMeta } from "@/meta/useMeta";
import { cn } from "@/utils/cn";
import { COLOR_MODE_LABELS, COLOR_MODES, PUBLIC_COLOR_MODES, type ColorMode } from "./mapColors";
import { countActiveMapFilters, EMPTY_MAP_FILTERS, type MapFilterValues } from "./mapFilterState";

export interface MapFiltersProps {
  value: MapFilterValues;
  onChange: (next: MapFilterValues) => void;
  /** Shows the priority and risk facets and the risk colour mode. */
  isAdmin?: boolean;
  /** Demo-data facet (default: same as isAdmin). */
  showSource?: boolean;
  showColorMode?: boolean;
  showDates?: boolean;
  /** "stack" for a sidebar or drawer, "inline" for a toolbar. */
  layout?: "stack" | "inline";
  /** Called by the reset button (default: onChange(EMPTY_MAP_FILTERS)). */
  onReset?: () => void;
  className?: string;
}

/**
 * Controlled filter panel for the map pages. The page owns the values (usually in the URL,
 * see mapFilterState.ts) and passes them back in; nothing here talks to the API.
 */
export function MapFilters({
  value,
  onChange,
  isAdmin = false,
  showSource = isAdmin,
  showColorMode = true,
  showDates = true,
  layout = "stack",
  onReset,
  className,
}: MapFiltersProps) {
  const meta = useMeta();
  const update = <K extends keyof MapFilterValues>(key: K, next: MapFilterValues[K]) =>
    onChange({ ...value, [key]: next });
  const active = countActiveMapFilters(value);
  const inline = layout === "inline";

  const categoryOptions: ChipOption<MapFilterValues["category"][number]>[] = meta.categories.map((c) => ({
    value: c.key,
    label: c.label,
    color: c.color,
  }));
  const statusOptions = STATUSES.filter((s) => isAdmin || s !== "REJECTED").map((s) => ({
    value: s,
    label: meta.label("status", s),
    color: STATUS_COLORS[s],
  }));
  const severityOptions = SEVERITIES.map((s) => ({
    value: s,
    label: meta.label("severity", s),
    color: SEVERITY_COLORS[s],
  }));
  const priorityOptions: ChipOption<PriorityFilterValue>[] = [
    ...PRIORITIES.map((p) => ({ value: p, label: meta.label("priority", p), color: PRIORITY_COLORS[p] })),
    { value: PRIORITY_UNASSIGNED, label: PRIORITY_UNASSIGNED_LABEL, color: NEUTRAL_COLOR },
  ];
  const riskOptions: ChipOption<RiskFilterValue>[] = [
    ...RISK_LEVELS.map((r) => ({ value: r, label: meta.label("riskLevel", r), color: RISK_COLORS[r] })),
    { value: RISK_NONE, label: RISK_NONE_LABEL, color: NEUTRAL_COLOR },
  ];
  const sourceOptions = SOURCES.map((s) => ({
    value: s,
    label: meta.label("source", s),
    color: SOURCE_COLORS[s],
  }));
  const colorModes = (isAdmin ? COLOR_MODES : PUBLIC_COLOR_MODES).map((m) => ({
    value: m,
    label: COLOR_MODE_LABELS[m],
  }));

  return (
    <div className={cn(inline ? "flex flex-wrap items-start gap-x-6 gap-y-4" : "space-y-5", className)}>
      {showColorMode && (
        <Fieldset legend="Colour markers by">
          <ChipToggleGroup
            label="Colour markers by"
            options={colorModes}
            value={[value.colorMode]}
            exclusive
            size="sm"
            onChange={(next: ColorMode[]) => update("colorMode", next[0] ?? value.colorMode)}
          />
        </Fieldset>
      )}
      <Fieldset legend="Category">
        <ChipToggleGroup
          label="Category"
          options={categoryOptions}
          value={value.category}
          size="sm"
          onChange={(next) => update("category", next)}
        />
      </Fieldset>
      <Fieldset legend="Status">
        <ChipToggleGroup
          label="Status"
          options={statusOptions}
          value={value.status}
          size="sm"
          onChange={(next) => update("status", next)}
        />
      </Fieldset>
      <Fieldset legend="Severity">
        <ChipToggleGroup
          label="Severity"
          options={severityOptions}
          value={value.severity}
          size="sm"
          onChange={(next) => update("severity", next)}
        />
      </Fieldset>
      {isAdmin && (
        <Fieldset legend="Priority">
          <ChipToggleGroup
            label="Priority"
            options={priorityOptions}
            value={value.priority}
            size="sm"
            onChange={(next) => update("priority", next)}
          />
        </Fieldset>
      )}
      {isAdmin && (
        <Fieldset
          legend="Risk level"
          description="Estimated from historical data; not every incident has an estimate."
        >
          <ChipToggleGroup
            label="Risk level"
            options={riskOptions}
            value={value.riskLevel}
            size="sm"
            onChange={(next) => update("riskLevel", next)}
          />
        </Fieldset>
      )}
      {showSource && (
        <Fieldset legend="Source">
          <ChipToggleGroup
            label="Source"
            options={sourceOptions}
            value={value.source}
            size="sm"
            onChange={(next) => update("source", next)}
          />
        </Fieldset>
      )}
      {showDates && (
        <Fieldset legend="Reported between">
          <div className={cn("grid gap-3", inline ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
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
      )}
      <div className={cn("flex items-center gap-3", !inline && "pt-1")}>
        <Button
          variant="ghost"
          size="sm"
          disabled={active === 0}
          onClick={() =>
            onReset ? onReset() : onChange({ ...EMPTY_MAP_FILTERS, colorMode: value.colorMode })
          }
          leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Reset filters
        </Button>
        <span className="text-xs text-muted" aria-live="polite">
          {active === 0 ? "No filters applied" : `${active} filter${active === 1 ? "" : "s"} applied`}
        </span>
      </div>
    </div>
  );
}
