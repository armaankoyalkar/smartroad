import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface ChipOption<T extends string = string> {
  value: T;
  label: ReactNode;
  /** Colour dot (category, status). */
  color?: string;
  disabled?: boolean;
}

export interface ChipToggleGroupProps<T extends string> {
  options: readonly ChipOption<T>[];
  value: readonly T[];
  onChange: (next: T[]) => void;
  /** Accessible name of the group. */
  label: string;
  /** At most one selected value (clicking the selected chip clears it). */
  exclusive?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/** Multi-select rendered as toggle buttons (aria-pressed); compact alternative to a checkbox list. */
export function ChipToggleGroup<T extends string>({
  options,
  value,
  onChange,
  label,
  exclusive = false,
  size = "md",
  className,
}: ChipToggleGroupProps<T>) {
  const toggle = (option: T) => {
    const selected = value.includes(option);
    if (exclusive) {
      onChange(selected ? [] : [option]);
      return;
    }
    onChange(selected ? value.filter((v) => v !== option) : [...value, option]);
  };

  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((option) => {
        const selected = value.includes(option.value);
        const tinted: CSSProperties | undefined =
          selected && option.color
            ? {
                backgroundColor: `color-mix(in srgb, ${option.color} 16%, transparent)`,
                borderColor: `color-mix(in srgb, ${option.color} 55%, transparent)`,
              }
            : undefined;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            disabled={option.disabled}
            onClick={() => toggle(option.value)}
            style={tinted}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:opacity-40",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm",
              selected
                ? "border-cyan-400/60 bg-cyan-400/15 text-text"
                : "border-navy-600 text-muted hover:border-navy-500 hover:text-text",
            )}
          >
            {option.color && (
              <span
                aria-hidden="true"
                className={cn("h-2 w-2 rounded-full", !selected && "opacity-70")}
                style={{ backgroundColor: option.color }}
              />
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
