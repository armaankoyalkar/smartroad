import { cloneElement, useId, useState, type ReactElement, type ReactNode } from "react";
import { cn } from "@/utils/cn";

export interface TooltipProps {
  content: ReactNode;
  /** A single focusable element (button, link); it receives aria-describedby while open. */
  children: ReactElement<{ "aria-describedby"?: string }>;
  side?: "top" | "bottom";
  className?: string;
}

/** Simple hover/focus tooltip. Never put essential information only in a tooltip. */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const child = cloneElement(children, {
    "aria-describedby": open ? id : children.props["aria-describedby"],
  });

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      {child}
      <span
        role="tooltip"
        id={id}
        hidden={!open}
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-xs -translate-x-1/2 rounded-md border border-navy-600 bg-navy-800 px-2 py-1 text-xs text-text shadow-pop",
          side === "top" ? "bottom-full mb-1.5" : "top-full mt-1.5",
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}
