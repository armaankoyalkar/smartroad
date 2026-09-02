import { cn } from "@/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconOnly?: boolean;
  className?: string;
}

const BASE =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap select-none " +
  "transition-[background-color,border-color,color,box-shadow,opacity] duration-150 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 " +
  "disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-cyan-400 text-navy-950 hover:bg-cyan-300 " +
    "shadow-[0_0_0_1px_rgb(34_211_238/0.35),0_8px_24px_-12px_rgb(34_211_238/0.6)]",
  secondary: "border border-navy-500 bg-navy-700 text-text hover:bg-navy-600",
  outline: "border border-navy-500 bg-transparent text-text hover:border-cyan-400/60 hover:bg-white/5",
  ghost: "bg-transparent text-muted hover:bg-white/5 hover:text-text",
  danger: "border border-danger/40 bg-danger/15 text-red-300 hover:bg-danger/25 hover:text-red-200",
};

const SIZES: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-xs",
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

const ICON_SIZES: Record<ButtonSize, string> = {
  xs: "h-7 w-7",
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

/** Class list shared by Button, LinkButton and IconButton so links can look like buttons. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth,
  iconOnly,
  className,
}: ButtonStyleOptions = {}): string {
  return cn(
    BASE,
    VARIANTS[variant],
    iconOnly ? ICON_SIZES[size] : SIZES[size],
    fullWidth && "w-full",
    className,
  );
}
