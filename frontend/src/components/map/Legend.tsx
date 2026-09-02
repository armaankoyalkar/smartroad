import type { ReactNode } from "react";
import { useMeta } from "@/meta/useMeta";
import { cn } from "@/utils/cn";
import { COLOR_MODE_LABELS, legendItems, type ColorMode, type LegendItem } from "./mapColors";

export interface LegendProps {
  mode: ColorMode;
  /** Defaults to "Colour by <mode>". */
  title?: ReactNode;
  /** Override the entries (for example only the categories present on the map). */
  items?: readonly LegendItem[];
  /** Lay the entries out in a row (toolbar) instead of a column (overlay). */
  horizontal?: boolean;
  /** Skip the glass panel styling (when embedded in another panel). */
  bare?: boolean;
  className?: string;
}

/** Marker colour legend driven by the same colour sources as the markers. Text always accompanies colour. */
export function Legend({ mode, title, items, horizontal = false, bare = false, className }: LegendProps) {
  const meta = useMeta();
  const entries = items ?? legendItems(mode, meta);
  return (
    <div className={cn(!bare && "glass-strong rounded-lg px-3 py-2.5", className)} aria-label="Map legend">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
        {title ?? `Colour by ${COLOR_MODE_LABELS[mode].toLowerCase()}`}
      </p>
      <ul className={cn("text-xs text-text", horizontal ? "flex flex-wrap gap-x-4 gap-y-1" : "space-y-1")}>
        {entries.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-navy-950/60"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
