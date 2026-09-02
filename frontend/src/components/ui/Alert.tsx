import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

export type AlertTone = "info" | "success" | "warning" | "danger" | "neutral";

const TONES: Record<AlertTone, { icon: LucideIcon; className: string; iconClassName: string }> = {
  info: { icon: Info, className: "border-blue-500/40 bg-blue-500/10", iconClassName: "text-blue-300" },
  success: {
    icon: CircleCheck,
    className: "border-success/40 bg-success/10",
    iconClassName: "text-green-300",
  },
  warning: {
    icon: TriangleAlert,
    className: "border-warning/40 bg-warning/10",
    iconClassName: "text-amber-300",
  },
  danger: { icon: CircleAlert, className: "border-danger/40 bg-danger/10", iconClassName: "text-red-300" },
  neutral: { icon: Info, className: "border-navy-600 bg-navy-800", iconClassName: "text-muted" },
};

export interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  /** Custom icon; `null` hides it. */
  icon?: LucideIcon | null;
  action?: ReactNode;
  className?: string;
  /** ARIA role: "alert" for urgent messages, "status" (default) otherwise. */
  role?: "alert" | "status" | "note";
}

/** Inline notice: demo-data warnings, ML unavailable, success confirmations. */
export function Alert({
  tone = "info",
  title,
  children,
  icon,
  action,
  className,
  role = "status",
}: AlertProps) {
  const config = TONES[tone];
  const Icon = icon === undefined ? config.icon : icon;
  return (
    <div
      role={role}
      className={cn(
        "flex items-start gap-3 rounded-lg border px-3.5 py-3 text-sm",
        config.className,
        className,
      )}
    >
      {Icon && <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.iconClassName)} aria-hidden="true" />}
      <div className="min-w-0 flex-1 space-y-0.5">
        {title && <p className="font-medium text-text">{title}</p>}
        {children && <div className={cn(title ? "text-muted" : "text-text")}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
