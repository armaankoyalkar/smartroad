import { useId, type ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  size?: "sm" | "md";
  id?: string;
  className?: string;
  /** Put the label before the switch (default after). */
  labelFirst?: boolean;
}

/** Accessible toggle (role=switch) for on/off options such as "include demo data". */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = "md",
  id: idProp,
  className,
  labelFirst = false,
}: SwitchProps) {
  const generated = useId();
  const id = idProp ?? `switch${generated}`;
  const descId = `${id}-desc`;
  const track = size === "sm" ? "h-5 w-9" : "h-6 w-11";
  const thumb = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const shift = size === "sm" ? "translate-x-4" : "translate-x-5";

  const button = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={description ? descId : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full border transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400",
        "disabled:cursor-not-allowed disabled:opacity-50",
        track,
        checked ? "border-cyan-400/60 bg-cyan-400/80" : "border-navy-500 bg-navy-700",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block translate-x-0.5 rounded-full bg-navy-950 shadow transition-transform duration-150",
          thumb,
          checked && shift,
        )}
      />
    </button>
  );

  const text = (
    <label
      htmlFor={id}
      className={cn("min-w-0 cursor-pointer text-sm text-text", disabled && "cursor-not-allowed")}
    >
      <span className="block leading-5">{label}</span>
      {description && (
        <span id={descId} className="block text-xs text-muted">
          {description}
        </span>
      )}
    </label>
  );

  return (
    <div className={cn("flex items-start gap-3", className)}>
      {labelFirst ? text : button}
      {labelFirst ? button : text}
    </div>
  );
}
