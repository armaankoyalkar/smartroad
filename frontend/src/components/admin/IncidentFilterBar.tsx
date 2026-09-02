import { useId, useState, type RefObject } from "react";
import { ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import {
  countActiveIncidentFilters,
  EMPTY_INCIDENT_FILTERS,
  type IncidentFilterValues,
} from "@/features/admin/incidentListParams";
import { cn } from "@/utils/cn";
import { IncidentFilterFields } from "./IncidentFilterFields";

export interface IncidentFilterBarProps {
  filters: IncidentFilterValues;
  onFiltersChange: (next: IncidentFilterValues) => void;
  /** Uncommitted search text (the page debounces it into the URL). */
  search: string;
  onSearchChange: (text: string) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
  /** Open the facet panel initially (for example when the URL already carries filters). */
  defaultOpen?: boolean;
  className?: string;
}

/** Search box plus a collapsible panel of facets; the page owns every value (in the URL). */
export function IncidentFilterBar({
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  searchInputRef,
  defaultOpen = false,
  className,
}: IncidentFilterBarProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const active = countActiveIncidentFilters(filters);

  return (
    <Card padding="sm" className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field label="Search incidents" labelHidden className="flex-1">
          <Input
            ref={searchInputRef}
            type="search"
            placeholder="Search title, description or address"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            leftIcon={<Search aria-hidden="true" />}
            rightElement={
              search ? (
                <IconButton
                  label="Clear search"
                  size="xs"
                  icon={<X className="h-3.5 w-3.5" aria-hidden="true" />}
                  onClick={() => onSearchChange("")}
                />
              ) : undefined
            }
          />
        </Field>
        <div className="flex items-center gap-2">
          <Button
            variant={active > 0 ? "secondary" : "outline"}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={panelId}
            leftIcon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
            rightIcon={
              <ChevronDown
                className={cn("h-4 w-4 transition-transform duration-150", open && "rotate-180")}
                aria-hidden="true"
              />
            }
          >
            Filters
            {active > 0 && (
              <span className="tabular rounded-full bg-cyan-400/20 px-1.5 py-0.5 text-[11px] text-cyan-300">
                {active}
              </span>
            )}
          </Button>
          {(active > 0 || search) && (
            <Button
              variant="ghost"
              onClick={() => {
                onFiltersChange(EMPTY_INCIDENT_FILTERS);
                onSearchChange("");
              }}
              leftIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
            >
              Reset
            </Button>
          )}
        </div>
      </div>
      <div id={panelId} hidden={!open} className="border-t border-navy-600 pt-4">
        <IncidentFilterFields value={filters} onChange={onFiltersChange} />
      </div>
      <p className="sr-only" aria-live="polite">
        {active === 0 ? "No filters applied" : `${active} filter${active === 1 ? "" : "s"} applied`}
      </p>
    </Card>
  );
}
