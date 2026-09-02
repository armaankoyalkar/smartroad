import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { STATUSES, type CategoryKey, type IncidentStatus } from "@/constants/enums";
import { useMeta } from "@/meta/useMeta";

export interface MyReportsFiltersProps {
  status: IncidentStatus | "";
  category: CategoryKey | "";
  onStatusChange: (status: IncidentStatus | "") => void;
  onCategoryChange: (category: CategoryKey | "") => void;
  onReset: () => void;
  activeFilterCount: number;
}

/** Status and category selects for the My reports list; values live in the URL. */
export function MyReportsFilters({
  status,
  category,
  onStatusChange,
  onCategoryChange,
  onReset,
  activeFilterCount,
}: MyReportsFiltersProps) {
  const meta = useMeta();
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Field label="Status" id="my-reports-status" className="sm:w-56">
        <Select
          selectSize="sm"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as IncidentStatus | "")}
          options={[
            { value: "", label: "All statuses" },
            ...STATUSES.map((s) => ({ value: s, label: meta.label("status", s) })),
          ]}
        />
      </Field>
      <Field label="Category" id="my-reports-category" className="sm:w-64">
        <Select
          selectSize="sm"
          value={category}
          onChange={(event) => onCategoryChange(event.target.value as CategoryKey | "")}
          options={[
            { value: "", label: "All categories" },
            ...meta.categories.map((c) => ({ value: c.key, label: c.label })),
          ]}
        />
      </Field>
      <div className="flex items-center gap-3 sm:pb-1">
        <Button
          variant="ghost"
          size="sm"
          disabled={activeFilterCount === 0}
          onClick={onReset}
          leftIcon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
        >
          Reset
        </Button>
        <span className="text-xs text-muted" aria-live="polite">
          {activeFilterCount === 0
            ? "No filters applied"
            : `${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"} applied`}
        </span>
      </div>
    </div>
  );
}
