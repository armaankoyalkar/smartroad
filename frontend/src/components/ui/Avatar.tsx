import { cn } from "@/utils/cn";
import { initials } from "@/utils/format";

export interface AvatarProps {
  name: string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = { sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-xs", lg: "h-12 w-12 text-sm" };

/** Initials on a cyan-tinted disc; purely decorative (the name is rendered next to it). */
export function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/15 font-semibold text-cyan-300",
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
