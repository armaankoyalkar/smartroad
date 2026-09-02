import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  /** Usually a Button or LinkButton. */
  action?: ReactNode;
  size?: "sm" | "md";
  className?: string;
}

/** Shown when a list, table or chart has nothing to display. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  size = "md",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        size === "sm" ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center rounded-full border border-navy-600 bg-navy-800 text-muted",
          size === "sm" ? "h-10 w-10" : "h-14 w-14",
        )}
      >
        <Icon className={size === "sm" ? "h-5 w-5" : "h-6 w-6"} />
      </span>
      <div className="space-y-1">
        <p className={cn("font-semibold text-text", size === "sm" ? "text-sm" : "text-base")}>{title}</p>
        {description && <p className="mx-auto max-w-md text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
