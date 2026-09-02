import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

export interface TabItem<T extends string = string> {
  value: T;
  label: ReactNode;
  icon?: LucideIcon;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps<T extends string> {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Shared prefix for tab and panel ids (pass the same value to TabPanel). */
  id?: string;
  variant?: "underline" | "pills";
  size?: "sm" | "md";
  className?: string;
  "aria-label": string;
}

/** Tab list with roving tabindex and arrow-key navigation (WAI-ARIA tabs pattern). */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  id: idProp,
  variant = "underline",
  size = "md",
  className,
  "aria-label": ariaLabel,
}: TabsProps<T>) {
  const generated = useId();
  const baseId = idProp ?? `tabs${generated}`;
  const buttons = useRef(new Map<T, HTMLButtonElement>());

  const move = (event: KeyboardEvent<HTMLButtonElement>, current: T) => {
    const enabled = items.filter((item) => !item.disabled);
    const index = enabled.findIndex((item) => item.value === current);
    if (index < 0) return;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = (index + 1) % enabled.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + enabled.length) % enabled.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = enabled.length - 1;
    if (next === null) return;
    event.preventDefault();
    const target = enabled[next];
    onChange(target.value);
    buttons.current.get(target.value)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex items-center gap-1 overflow-x-auto scrollbar-thin",
        variant === "underline"
          ? "border-b border-navy-600"
          : "rounded-lg border border-navy-600 bg-navy-900/60 p-1",
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            ref={(el) => {
              if (el) buttons.current.set(item.value, el);
              else buttons.current.delete(item.value);
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${item.value}`}
            aria-selected={selected}
            aria-controls={`${baseId}-panel-${item.value}`}
            tabIndex={selected ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => move(event, item.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-medium transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 disabled:opacity-40",
              size === "sm" ? "text-xs" : "text-sm",
              variant === "underline"
                ? cn(
                    "-mb-px border-b-2 px-3 py-2.5",
                    selected ? "border-cyan-400 text-text" : "border-transparent text-muted hover:text-text",
                  )
                : cn(
                    "rounded-md px-3 py-1.5",
                    selected ? "bg-navy-700 text-text shadow-card" : "text-muted hover:text-text",
                  ),
            )}
          >
            {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
            {item.label}
            {typeof item.count === "number" && (
              <span
                className={cn(
                  "tabular rounded-full px-1.5 py-0.5 text-[11px] leading-none",
                  selected ? "bg-cyan-400/20 text-cyan-300" : "bg-white/5 text-muted",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface TabPanelProps<T extends string> {
  /** The `id` passed to Tabs. */
  tabsId: string;
  value: T;
  activeValue: T;
  children: ReactNode;
  className?: string;
  /** Keep inactive panels mounted (hidden) instead of unmounting them. */
  keepMounted?: boolean;
}

export function TabPanel<T extends string>({
  tabsId,
  value,
  activeValue,
  children,
  className,
  keepMounted = false,
}: TabPanelProps<T>) {
  const active = value === activeValue;
  if (!active && !keepMounted) return null;
  return (
    <div
      role="tabpanel"
      id={`${tabsId}-panel-${value}`}
      aria-labelledby={`${tabsId}-tab-${value}`}
      hidden={!active}
      tabIndex={0}
      className={cn(
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400",
        className,
      )}
    >
      {children}
    </div>
  );
}
