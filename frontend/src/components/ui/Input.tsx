import { useState, type ComponentPropsWithRef, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/utils/cn";
import { useFieldControl } from "./FieldContext";
import { controlClasses } from "./fieldStyles";

export interface InputProps extends Omit<ComponentPropsWithRef<"input">, "size"> {
  invalid?: boolean;
  inputSize?: "sm" | "md";
  leftIcon?: ReactNode;
  /** Absolutely positioned on the right (a button, a unit label). */
  rightElement?: ReactNode;
}

/** Text input. Inside a <Field> it inherits id, aria-describedby and aria-invalid. */
export function Input({
  invalid,
  inputSize = "md",
  leftIcon,
  rightElement,
  className,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...rest
}: InputProps) {
  const control = useFieldControl({
    id,
    invalid,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });
  return (
    <div className="relative w-full">
      {leftIcon && (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted [&>svg]:h-4 [&>svg]:w-4">
          {leftIcon}
        </span>
      )}
      <input
        id={control.id}
        aria-invalid={control.invalid || undefined}
        aria-describedby={control.describedBy}
        className={cn(
          controlClasses({ invalid: control.invalid, size: inputSize }),
          leftIcon && "pl-9",
          rightElement && "pr-10",
          className,
        )}
        {...rest}
      />
      {rightElement && <span className="absolute inset-y-0 right-1.5 flex items-center">{rightElement}</span>}
    </div>
  );
}

export interface TextareaProps extends ComponentPropsWithRef<"textarea"> {
  invalid?: boolean;
}

export function Textarea({
  invalid,
  className,
  id,
  rows = 4,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...rest
}: TextareaProps) {
  const control = useFieldControl({
    id,
    invalid,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  });
  return (
    <textarea
      id={control.id}
      rows={rows}
      aria-invalid={control.invalid || undefined}
      aria-describedby={control.describedBy}
      className={cn(controlClasses({ invalid: control.invalid, multiline: true }), "resize-y", className)}
      {...rest}
    />
  );
}

export type PasswordInputProps = Omit<InputProps, "type" | "rightElement">;

/** Password field with a show/hide toggle (aria-pressed). */
export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      type={visible ? "text" : "password"}
      autoComplete="current-password"
      {...props}
      rightElement={
        <button
          type="button"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan-400"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      }
    />
  );
}
