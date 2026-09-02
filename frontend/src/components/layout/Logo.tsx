import { Link } from "react-router";
import { cn } from "@/utils/cn";

export interface LogoMarkProps {
  size?: number;
  className?: string;
}

/** Road-network mark: a junction of three roads with lit nodes. Inline SVG, no image assets. */
export function LogoMark({ size = 28, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#0B1220" stroke="#22314F" />
      <path
        d="M8 24 L16 12 L24 24"
        fill="none"
        stroke="#22D3EE"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 12 V6.5" stroke="#67E8F9" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M11.4 18.8 H20.6"
        stroke="#3B82F6"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeDasharray="2.4 2.4"
      />
      <circle cx="8" cy="24" r="2.4" fill="#22D3EE" />
      <circle cx="24" cy="24" r="2.4" fill="#22D3EE" />
      <circle cx="16" cy="6" r="2.4" fill="#E6EDF7" />
      <circle cx="16" cy="12" r="2" fill="#0B1220" stroke="#67E8F9" strokeWidth="1.6" />
    </svg>
  );
}

export interface LogoProps {
  size?: number;
  withWordmark?: boolean;
  /** Link target; `null` renders a plain span (for use inside another link). */
  to?: string | null;
  /** Small badge after the wordmark ("Admin"). */
  badge?: string;
  className?: string;
}

export function Logo({ size = 28, withWordmark = true, to = "/", badge, className }: LogoProps) {
  const content = (
    <>
      <LogoMark size={size} />
      {withWordmark && (
        <span className="flex items-baseline gap-1.5">
          <span className="text-base font-semibold tracking-tight text-text">
            Smart<span className="text-cyan-300">Road</span>
          </span>
          {badge && (
            <span className="rounded border border-cyan-400/40 bg-cyan-400/10 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
              {badge}
            </span>
          )}
        </span>
      )}
    </>
  );
  const classes = cn("inline-flex items-center gap-2.5", className);
  if (to === null) return <span className={classes}>{content}</span>;
  return (
    <Link
      to={to}
      aria-label={`SmartRoad${badge ? ` ${badge}` : ""} home`}
      className={cn(
        classes,
        "rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400",
      )}
    >
      {content}
    </Link>
  );
}
