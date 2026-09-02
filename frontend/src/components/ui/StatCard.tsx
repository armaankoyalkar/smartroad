import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/utils/cn";
import { Skeleton } from "./Skeleton";

export type StatTone = "default" | "accent" | "success" | "warning" | "danger" | "info";

const TONES: Record<StatTone, string> = {
  default: "border-navy-600 bg-navy-700 text-muted",
  accent: "border-cyan-400/40 bg-cyan-400/10 text-cyan-300",
  success: "border-success/40 bg-success/10 text-green-300",
  warning: "border-warning/40 bg-warning/10 text-amber-300",
  danger: "border-danger/40 bg-danger/10 text-red-300",
  info: "border-blue-500/40 bg-blue-500/10 text-blue-300",
};

export interface StatCardProps {
  label: ReactNode;
  /** The figure. Always fetched: while `isLoading` a skeleton is shown instead of a placeholder number. */
  value: ReactNode;
  caption?: ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
  isLoading?: boolean;
  /** Makes the whole card a link. */
  to?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  tone = "default",
  isLoading = false,
  to,
  className,
}: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {Icon && (
          <span
            aria-hidden="true"
            className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", TONES[tone])}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="mt-2">
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="tabular text-2xl font-semibold tracking-tight text-text sm:text-3xl">{value}</p>
        )}
      </div>
      {caption && <p className="mt-1 text-xs text-muted">{caption}</p>}
    </>
  );

  const classes = cn("surface block p-4 shadow-card sm:p-5", className);
  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          classes,
          "transition-colors duration-150 hover:border-navy-500 hover:bg-navy-700/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400",
        )}
      >
        {body}
      </Link>
    );
  }
  return <div className={classes}>{body}</div>;
}
