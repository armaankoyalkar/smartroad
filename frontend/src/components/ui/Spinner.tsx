import { cn } from "@/utils/cn";

export type SpinnerSize = "sm" | "md" | "lg";

const SIZES: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
};

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  /** Screen-reader text (default "Loading"). Ignored when `decorative`. */
  label?: string;
  /** Hide from assistive technology (use when a parent already announces the busy state). */
  decorative?: boolean;
}

export function Spinner({ size = "md", className, label = "Loading", decorative = false }: SpinnerProps) {
  return (
    <span
      role={decorative ? undefined : "status"}
      aria-hidden={decorative || undefined}
      className={cn(
        "inline-block animate-spin rounded-full border-current border-t-transparent",
        SIZES[size],
        className,
      )}
    >
      {!decorative && <span className="sr-only">{label}</span>}
    </span>
  );
}
