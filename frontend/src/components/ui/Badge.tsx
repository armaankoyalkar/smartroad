import type { CSSProperties, ComponentProps, ReactNode } from "react";
import { NEUTRAL_COLOR } from "@/constants/colors";
import { cn } from "@/utils/cn";

export type BadgeVariant = "soft" | "solid" | "outline";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends ComponentProps<"span"> {
  /** Any CSS colour: a value from constants/colors.ts or a category colour from the API. */
  color?: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Coloured dot before the text (soft and outline variants). Default true. */
  dot?: boolean;
  /** Replaces the dot. */
  icon?: ReactNode;
}

/**
 * Colour-coded label. Text stays light on a tinted background so contrast never depends on
 * the semantic colour, and the text itself always carries the meaning (never colour alone).
 */
export function Badge({
  color = NEUTRAL_COLOR,
  variant = "soft",
  size = "md",
  dot = true,
  icon,
  className,
  style,
  children,
  ...rest
}: BadgeProps) {
  const sizing = size === "sm" ? "h-5 gap-1 px-1.5 text-[11px]" : "h-6 gap-1.5 px-2 text-xs";
  const colors: CSSProperties =
    variant === "solid"
      ? { backgroundColor: color, borderColor: color, color: "#070D19" }
      : variant === "outline"
        ? { borderColor: color }
        : {
            backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
            borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
          };
  const marker =
    icon ??
    (dot && variant !== "solid" ? (
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
    ) : null);

  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md border font-medium leading-none",
        sizing,
        variant !== "solid" && "text-text",
        className,
      )}
      style={{ ...colors, ...style }}
      {...rest}
    >
      {marker}
      {children}
    </span>
  );
}
