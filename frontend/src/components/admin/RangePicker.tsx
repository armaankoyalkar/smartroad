import { Card } from "@/components/ui/Card";
import { ChipToggleGroup } from "@/components/ui/ChipToggleGroup";
import { Field, Fieldset } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import {
  presetDates,
  RANGE_PRESETS,
  type AnalyticsRange,
  type RangeKey,
} from "@/features/admin/analyticsRange";

export interface RangePickerProps {
  value: AnalyticsRange;
  onChange: (next: AnalyticsRange) => void;
  className?: string;
}

const OPTIONS: { value: RangeKey; label: string }[] = [
  ...RANGE_PRESETS.map((p) => ({ value: p.key, label: p.label })),
  { value: "custom", label: "Custom" },
];

/** Shared analytics range (presets or custom dates) and the "include demo data" switch. */
export function RangePicker({ value, onChange, className }: RangePickerProps) {
  const choose = (next: RangeKey) => {
    if (next === "custom") onChange({ ...value, preset: "custom" });
    else onChange({ ...value, preset: next, ...presetDates(next) });
  };

  return (
    <Card padding="sm" className={className}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Fieldset legend="Period" legendHidden>
            <ChipToggleGroup
              label="Period"
              size="sm"
              exclusive
              options={OPTIONS}
              value={[value.preset]}
              onChange={(next) => choose(next[0] ?? value.preset)}
            />
          </Fieldset>
          {value.preset === "custom" && (
            <div className="grid max-w-sm grid-cols-2 gap-3">
              <Field label="From">
                <Input
                  type="date"
                  inputSize="sm"
                  value={value.from}
                  max={value.to || undefined}
                  onChange={(e) => onChange({ ...value, from: e.target.value })}
                />
              </Field>
              <Field label="To">
                <Input
                  type="date"
                  inputSize="sm"
                  value={value.to}
                  min={value.from || undefined}
                  onChange={(e) => onChange({ ...value, to: e.target.value })}
                />
              </Field>
            </div>
          )}
        </div>
        <Switch
          size="sm"
          checked={value.includeSeed}
          onChange={(checked) => onChange({ ...value, includeSeed: checked })}
          label="Include demo data"
          description="Seed records are marked as demo data."
        />
      </div>
    </Card>
  );
}
