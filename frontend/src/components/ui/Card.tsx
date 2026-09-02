import type { ComponentProps, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { cn } from "@/utils/cn";

export type CardPadding = "none" | "sm" | "md" | "lg";

const PADDING: Record<CardPadding, string> = {
  none: "",
  sm: "p-3 sm:p-4",
  md: "p-4 sm:p-5",
  lg: "p-5 sm:p-7",
};

export interface CardProps extends ComponentProps<"div"> {
  padding?: CardPadding;
  /** Hover treatment for clickable cards. */
  interactive?: boolean;
  /** Lighter surface (navy-700) for nesting inside another card. */
  elevated?: boolean;
}

/** Standard surface: navy-800, 1px navy-600 border, 12px radius. */
export function Card({
  padding = "md",
  interactive = false,
  elevated = false,
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        elevated ? "surface-elevated" : "surface",
        "shadow-card",
        PADDING[padding],
        interactive && "transition-colors duration-150 hover:border-navy-500 hover:bg-navy-700/70",
        className,
      )}
      {...rest}
    />
  );
}

export interface CardLinkProps extends LinkProps {
  padding?: CardPadding;
}

/** A whole card as a link (keyboard focusable, same look as an interactive Card). */
export function CardLink({ padding = "md", className, ...rest }: CardLinkProps) {
  return (
    <Link
      className={cn(
        "surface block shadow-card transition-colors duration-150 hover:border-navy-500 hover:bg-navy-700/70",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400",
        PADDING[padding],
        className as string | undefined,
      )}
      {...rest}
    />
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Heading level for the title (default h2). */
  as?: "h2" | "h3" | "h4";
}

export function CardHeader({ title, description, actions, className, as: Heading = "h2" }: CardHeaderProps) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <Heading className="text-base font-semibold leading-6 text-text">{title}</Heading>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface PanelProps extends ComponentProps<"div"> {
  padding?: CardPadding;
  /** Stronger blur and darker tint for overlays on top of maps. */
  strong?: boolean;
}

/** Glass surface (translucent, blurred) for overlays and hero content. */
export function Panel({ padding = "md", strong = false, className, ...rest }: PanelProps) {
  return (
    <div
      className={cn(strong ? "glass-strong" : "glass", "rounded-card", PADDING[padding], className)}
      {...rest}
    />
  );
}
