import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/utils/cn";
import { IconButton } from "./Button";

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  side?: "left" | "right";
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
  /** Visually hide the title (it still labels the dialog). */
  titleHidden?: boolean;
  className?: string;
}

const WIDTHS = { sm: "max-w-xs", md: "max-w-sm", lg: "max-w-md" };

/** Side panel with the same accessibility contract as Dialog (used for mobile navigation and filters). */
export function Drawer({
  open,
  onClose,
  title,
  children,
  side = "left",
  size = "md",
  footer,
  titleHidden = false,
  className,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const titleId = `drawer${id}-title`;

  useFocusTrap(panelRef, open, { onEscape: onClose });

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 animate-fade-in bg-navy-950/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "absolute inset-y-0 flex w-full flex-col border-navy-600 bg-navy-900 shadow-pop outline-none",
          WIDTHS[size],
          side === "left"
            ? "left-0 animate-slide-in-left border-r"
            : "right-0 animate-slide-in-right border-l",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-navy-600 px-4 py-3">
          <h2 id={titleId} className={cn("text-base font-semibold text-text", titleHidden && "sr-only")}>
            {title}
          </h2>
          <IconButton
            label="Close"
            size="sm"
            icon={<X className="h-4 w-4" aria-hidden="true" />}
            onClick={onClose}
            className={cn(titleHidden && "ml-auto")}
            data-focus-skip=""
          />
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer && <div className="border-t border-navy-600 p-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
