import type { ReactNode } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/utils/cn";

export interface Breadcrumb {
  label: ReactNode;
  to?: string;
}

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Small uppercase text above the title (section name). */
  eyebrow?: ReactNode;
  /** Buttons rendered on the right (wrap below the title on phones). */
  actions?: ReactNode;
  breadcrumbs?: readonly Breadcrumb[];
  /** "Back" link rendered above the title. */
  backTo?: { to: string; label: string };
  /** Badges rendered next to the title. */
  titleAddon?: ReactNode;
  /** Extra content under the header (tabs, filters). */
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  breadcrumbs,
  backTo,
  titleAddon,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("animate-fade-in space-y-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted">
            {breadcrumbs.map((crumb, index) => {
              const last = index === breadcrumbs.length - 1;
              return (
                <li key={index} className="flex items-center gap-1">
                  {crumb.to && !last ? (
                    <Link
                      to={crumb.to}
                      className="rounded transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span aria-current={last ? "page" : undefined} className={cn(last && "text-text")}>
                      {crumb.label}
                    </span>
                  )}
                  {!last && <ChevronRight className="h-3 w-3 text-faint" aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
        </nav>
      )}
      {backTo && (
        <Link
          to={backTo.to}
          className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {backTo.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">{eyebrow}</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-3xl">{title}</h1>
            {titleAddon}
          </div>
          {description && <p className="max-w-2xl text-sm text-muted sm:text-base">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
