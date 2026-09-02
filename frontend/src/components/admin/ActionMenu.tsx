import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import type { ButtonSize, ButtonVariant } from "@/components/ui/buttonStyles";
import { cn } from "@/utils/cn";

export interface ActionMenuItem {
  key: string;
  label: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  icon?: ReactNode;
  /** Marks the current value (aria-checked). */
  current?: boolean;
}

export interface ActionMenuProps {
  /** Accessible name of the trigger (also its visible text unless `icon` is given). */
  label: string;
  items: readonly ActionMenuItem[];
  /** Icon-only trigger. */
  icon?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  /** Shown as a disabled entry when `items` is empty. */
  emptyMessage?: string;
  align?: "left" | "right";
  className?: string;
}

const MENU_WIDTH = 224;

/**
 * Dropdown of actions (WAI-ARIA menu button): arrow keys move, Home/End jump, Escape closes and
 * returns focus, outside clicks close. Rendered in a portal so table overflow never clips it.
 */
export function ActionMenu({
  label,
  items,
  icon,
  variant = "outline",
  size = "sm",
  disabled = false,
  loading = false,
  emptyMessage = "No actions available",
  align = "right",
  className,
}: ActionMenuProps) {
  const id = useId();
  const menuId = `menu${id}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const toggle = () => {
    if (open) {
      close();
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const left = align === "right" ? Math.max(8, rect.right - MENU_WIDTH) : rect.left;
      setPosition({ top: rect.bottom + 4, left: Math.min(left, window.innerWidth - MENU_WIDTH - 8) });
    }
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>(
      "[role^='menuitem']:not([aria-disabled='true'])",
    );
    first?.focus();
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onScrollOrResize = () => setOpen(false);
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open]);

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const entries = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>("[role^='menuitem']:not([aria-disabled='true'])") ?? [],
    );
    const index = entries.findIndex((el) => el === document.activeElement);
    let next: number | null = null;
    if (event.key === "ArrowDown") next = (index + 1) % entries.length;
    else if (event.key === "ArrowUp") next = (index - 1 + entries.length) % entries.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = entries.length - 1;
    else if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    } else if (event.key === "Tab") {
      close(false);
      return;
    }
    if (next === null || entries.length === 0) return;
    event.preventDefault();
    entries[next]?.focus();
  };

  const triggerProps = {
    ref: triggerRef,
    "aria-haspopup": "menu" as const,
    "aria-expanded": open,
    "aria-controls": open ? menuId : undefined,
    disabled,
    loading,
    onClick: toggle,
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowDown" && !open) {
        event.preventDefault();
        toggle();
      }
    },
    className,
  };

  return (
    <>
      {icon ? (
        <IconButton label={label} icon={icon} variant={variant} size={size} {...triggerProps} />
      ) : (
        <Button
          variant={variant}
          size={size}
          rightIcon={<ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
          {...triggerProps}
        >
          {label}
        </Button>
      )}
      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKeyDown}
            style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
            className="surface fixed z-50 animate-scale-in p-1 shadow-pop"
          >
            {items.length === 0 && (
              <p role="menuitem" aria-disabled="true" className="px-3 py-2 text-xs text-muted">
                {emptyMessage}
              </p>
            )}
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                role={item.current === undefined ? "menuitem" : "menuitemradio"}
                aria-checked={item.current === undefined ? undefined : item.current}
                aria-disabled={item.disabled || undefined}
                tabIndex={-1}
                onClick={() => {
                  if (item.disabled) return;
                  close();
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors duration-100",
                  "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-400",
                  item.disabled ? "cursor-not-allowed opacity-40" : "hover:bg-white/5 focus:bg-white/5",
                  item.tone === "danger" ? "text-red-300" : "text-text",
                  item.current && "bg-cyan-400/10",
                )}
              >
                {item.icon && (
                  <span className="shrink-0 text-muted [&>svg]:h-4 [&>svg]:w-4">{item.icon}</span>
                )}
                <span className="min-w-0 flex-1">{item.label}</span>
                {item.current && <span className="text-[11px] text-cyan-300">current</span>}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
