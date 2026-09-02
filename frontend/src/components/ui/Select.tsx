import type { ComponentPropsWithRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";
import { useFieldControl } from "./FieldContext";
import { controlClasses } from "./fieldStyles";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<ComponentPropsWithRef<"select">, "size"> {
  /** Options rendered as <option>; alternatively pass <option> children. */
  options?: readonly SelectOption[];
  /** First option (value "") shown when nothing is selected. */
  placeholder?: string;
  invalid?: boolean;
  selectSize?: "sm" | "md";
}

/** Native select (keyboard and screen-reader friendly), themed. */
export function Select({
  options,
  placeholder,
  invalid,
  selectSize = "md",
  className,
  id,
  children,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...rest
}: SelectProps) {
  const control = useFieldControl({
    id,
    invalid,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });
  return (
    <div className="relative w-full">
      <select
        id={control.id}
        aria-invalid={control.invalid || undefined}
        aria-describedby={control.describedBy}
        className={cn(
          controlClasses({ invalid: control.invalid, size: selectSize }),
          "appearance-none pr-9 [&>option]:bg-navy-800 [&>option]:text-text",
          className,
        )}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options?.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
    </div>
  );
}
