import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface SectionProps {
  id?: string;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Centre the header text. */
  centered?: boolean;
  className?: string;
}

/** Landing-page section shell: eyebrow, heading, description and content in the 7xl container. */
export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  centered = false,
  className,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn("py-16 sm:py-20", className)}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <header className={cn("max-w-2xl space-y-3", centered && "mx-auto text-center")}>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">{eyebrow}</p>
          )}
          <h2
            id={id ? `${id}-title` : undefined}
            className="text-2xl font-semibold tracking-tight text-text sm:text-3xl"
          >
            {title}
          </h2>
          {description && <p className="text-base text-muted">{description}</p>}
        </header>
        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
