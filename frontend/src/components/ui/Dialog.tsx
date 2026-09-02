import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { cn } from "@/utils/cn";
import { IconButton } from "./Button";

export type DialogSize = "sm" | "md" | "lg" | "xl";

const SIZES: Record<DialogSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export interface DialogProps {
  open: boolean;
  /** Called on Escape, on the close button and (by default) on overlay click. */
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Buttons, rendered right-aligned on desktop and stacked on phones. */
  footer?: ReactNode;
  size?: DialogSize;
  /** Element focused when the dialog opens (default: first focusable element in the body). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  closeOnOverlayClick?: boolean;
  hideCloseButton?: boolean;
  className?: string;
}

/**
 * Accessible modal: role=dialog, aria-modal, labelled by its title, focus trapped inside,
 * Escape closes, focus returns to the opener, background scroll locked.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  initialFocusRef,
  closeOnOverlayClick = true,
  hideCloseButton = false,
  className,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const titleId = `dialog${id}-title`;
  const descId = `dialog${id}-desc`;

  useFocusTrap(panelRef, open, { onEscape: onClose, initialFocus: initialFocusRef });

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
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <div
        className="absolute inset-0 animate-fade-in bg-navy-950/75 backdrop-blur-sm"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "surface relative flex max-h-[calc(100dvh-1.5rem)] w-full animate-scale-in flex-col shadow-pop outline-none",
          SIZES[size],
          className,
        )}
      >
        <div className={cn("flex items-start justify-between gap-4 px-5 pt-5", children ? "pb-1" : "pb-4")}>
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-semibold leading-6 text-text">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          {!hideCloseButton && (
            <IconButton
              label="Close"
              size="sm"
              icon={<X className="h-4 w-4" aria-hidden="true" />}
              onClick={onClose}
              className="-mr-2 -mt-1"
              data-focus-skip=""
            />
          )}
        </div>
        {children && (
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        )}
        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-navy-600 px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export { Dialog as Modal };
