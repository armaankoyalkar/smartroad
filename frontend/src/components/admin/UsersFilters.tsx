import { RotateCcw, Search, X } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ROLES, type Role } from "@/constants/enums";
import {
  EMPTY_USER_FILTERS,
  type ActiveFilter,
  type UserFilterValues,
} from "@/features/admin/userListParams";
import { useMeta } from "@/meta/useMeta";

export interface UsersFiltersProps {
  filters: UserFilterValues;
  onFiltersChange: (next: UserFilterValues) => void;
  search: string;
  onSearchChange: (text: string) => void;
  className?: string;
}

/** Search, role and active-state filters for GET /api/users. */
export function UsersFilters({
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  className,
}: UsersFiltersProps) {
  const meta = useMeta();
  const dirty = filters.role !== "" || filters.isActive !== "" || search !== "";
  return (
    <Card padding="sm" className={className}>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
        <Field label="Search users" labelHidden>
          <Input
            type="search"
            placeholder="Search name or email"
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
        <Field label="Role">
          <Select
            selectSize="md"
            value={filters.role}
            onChange={(event) =>
              onFiltersChange({ ...filters, role: (event.target.value as Role | "") || "" })
            }
          >
            <option value="">All roles</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {meta.label("role", role)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Account">
          <Select
            value={filters.isActive}
            onChange={(event) =>
              onFiltersChange({ ...filters, isActive: event.target.value as ActiveFilter })
            }
          >
            <option value="">Active and deactivated</option>
            <option value="true">Active only</option>
            <option value="false">Deactivated only</option>
          </Select>
        </Field>
        <Button
          variant="ghost"
          disabled={!dirty}
          onClick={() => {
            onFiltersChange(EMPTY_USER_FILTERS);
            onSearchChange("");
          }}
          leftIcon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
        >
          Reset
        </Button>
      </div>
    </Card>
  );
}
