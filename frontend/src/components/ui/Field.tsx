import { useId, useMemo, type ReactNode } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/utils/cn";
import { FieldContext, type FieldContextValue } from "./FieldContext";

export interface FieldProps {
  label: ReactNode;
  /** Id of the control; generated when omitted. */
  id?: string;
  hint?: ReactNode;
  /** Error message. When present it is announced (role=alert) and the control gets aria-invalid. */
  error?: ReactNode;
  required?: boolean;
  /** Show "(optional)" next to the label. */
  showOptional?: boolean;
  labelHidden?: boolean;
  /** Rendered on the right of the label row (a "Forgot password?" link, a character counter). */
  labelAddon?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Label + control + hint + error, wired with htmlFor / aria-describedby / aria-invalid.
 * Any Input, Textarea, Select or Checkbox inside picks the ids up through FieldContext.
 */
export function Field({
  label,
  id: idProp,
  hint,
  error,
  required = false,
  showOptional = false,
  labelHidden = false,
  labelAddon,
  className,
  children,
}: FieldProps) {
  const generated = useId();
  const id = idProp ?? `field${generated}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const invalid = Boolean(error);
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  const context = useMemo<FieldContextValue>(
    () => ({ id, describedBy, invalid, required }),
    [id, describedBy, invalid, required],
  );

  return (
    <FieldContext.Provider value={context}>
      <div className={cn("space-y-1.5", className)}>
        <div
          className={cn("flex items-baseline justify-between gap-2", labelHidden && !labelAddon && "sr-only")}
        >
          <label htmlFor={id} className={cn("text-sm font-medium text-text", labelHidden && "sr-only")}>
            {label}
            {required && (
              <span aria-hidden="true" className="ml-0.5 text-danger">
                *
              </span>
            )}
            {!required && showOptional && (
              <span className="ml-1.5 text-xs font-normal text-muted">(optional)</span>
            )}
          </label>
          {labelAddon}
        </div>
        {children}
        {hint && (
          <p id={hintId} className="text-xs text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="flex items-start gap-1 text-xs text-red-300">
            <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

export interface FieldsetProps {
  legend: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  legendHidden?: boolean;
  className?: string;
  children: ReactNode;
}

/** Group of related controls (radio buttons, checkbox chips) with a legend and shared error. */
export function Fieldset({
  legend,
  description,
  error,
  legendHidden = false,
  className,
  children,
}: FieldsetProps) {
  const id = useId();
  const descId = `fs${id}-desc`;
  const errorId = `fs${id}-error`;
  const describedBy =
    [description ? descId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset
      className={cn("min-w-0 space-y-2", className)}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
    >
      <legend className={cn("mb-1.5 text-sm font-medium text-text", legendHidden && "sr-only")}>
        {legend}
      </legend>
      {description && (
        <p id={descId} className="text-xs text-muted">
          {description}
        </p>
      )}
      {children}
      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1 text-xs text-red-300">
          <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </fieldset>
  );
}

/** Form-level error banner (server message that maps to no single field). */
export function FormError({ message, className }: { message?: ReactNode | null; className?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-red-200",
        className,
      )}
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>{message}</div>
    </div>
  );
}
