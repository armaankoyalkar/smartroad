import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { cn } from "@/utils/cn";

export interface AuthCardProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Links under the card ("New here? Register"). */
  footer?: ReactNode;
  /** Administrator styling: badge on the logo and a blue accent line. */
  admin?: boolean;
}

/** Centred card used by the sign-in and registration pages (inside PublicLayout). */
export function AuthCard({ eyebrow, title, description, children, footer, admin = false }: AuthCardProps) {
  return (
    <section className="city-grid relative flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:px-6 sm:py-16">
      <div className="glow-spot pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="mb-6 flex justify-center">
          <Logo size={32} badge={admin ? "Admin" : undefined} />
        </div>
        <div className={cn("surface overflow-hidden shadow-pop", admin && "border-blue-500/40")}>
          <div
            aria-hidden="true"
            className={cn("h-1 w-full", admin ? "bg-gradient-to-r from-blue-500 to-cyan-400" : "bg-cyan-400")}
          />
          <div className="space-y-6 p-6 sm:p-8">
            <header className="space-y-1">
              {eyebrow && (
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-300">{eyebrow}</p>
              )}
              <h1 className="text-2xl font-semibold tracking-tight text-text">{title}</h1>
              {description && <p className="text-sm text-muted">{description}</p>}
            </header>
            {children}
          </div>
        </div>
        {footer && <div className="mt-5 space-y-1 text-center text-sm text-muted">{footer}</div>}
      </div>
    </section>
  );
}
