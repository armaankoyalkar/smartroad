import type { ComponentPropsWithRef, ReactNode } from "react";
import { cn } from "@/utils/cn";
import { useFieldControl } from "./FieldContext";

export interface CheckboxProps extends Omit<ComponentPropsWithRef<"input">, "type" | "size"> {
  label: ReactNode;
  description?: ReactNode;
  invalid?: boolean;
}

/** Checkbox with its own visible label (put it inside a <Fieldset> for a group error). */
export function Checkbox({
  label,
  description,
  invalid,
  className,
  id,
  disabled,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...rest
}: CheckboxProps) {
  const control = useFieldControl({
    id,
    invalid,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });
  return (
    <label
      htmlFor={control.id}
      className={cn(
        "flex cursor-pointer items-start gap-3 text-sm text-text",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        id={control.id}
        type="checkbox"
        disabled={disabled}
        aria-invalid={control.invalid || undefined}
        aria-describedby={control.describedBy}
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-navy-500 bg-navy-900 accent-cyan-400",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400",
          control.invalid && "outline outline-1 outline-danger/70",
        )}
        {...rest}
      />
      <span className="min-w-0">
        <span className="block leading-5">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}
