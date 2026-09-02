import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
].join(",");

/** Focusable descendants in DOM order (disabled and aria-hidden elements excluded). */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  );
}

export interface FocusTrapOptions {
  /** Called on Escape (the trap never closes anything by itself). */
  onEscape?: () => void;
  /** Element to focus first; otherwise the first focusable element without `data-focus-skip`. */
  initialFocus?: RefObject<HTMLElement | null>;
  /** Return focus to the previously focused element when the trap deactivates (default true). */
  restoreFocus?: boolean;
}

/**
 * Keeps Tab / Shift+Tab inside `containerRef` while `active`, moves focus in on activation,
 * calls `onEscape` on Escape and restores the previous focus on deactivation.
 * Used by Dialog, Drawer and the admin navigation drawer.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  options: FocusTrapOptions = {},
): void {
  const { restoreFocus = true } = options;
  // Latest callbacks, updated after every render so the trap effect never re-subscribes.
  const onEscapeRef = useRef(options.onEscape);
  const initialFocusRef = useRef(options.initialFocus);
  useEffect(() => {
    onEscapeRef.current = options.onEscape;
    initialFocusRef.current = options.initialFocus;
  });

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const timer = window.setTimeout(() => {
      const preferred = initialFocusRef.current?.current;
      const target =
        preferred ??
        getFocusableElements(container).find((el) => !el.hasAttribute("data-focus-skip")) ??
        container;
      target.focus({ preventScroll: true });
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onEscapeRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const items = getFocusableElements(container);
      if (items.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      const inside = current instanceof Node && container.contains(current);
      if (event.shiftKey) {
        if (!inside || current === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown, true);
      if (restoreFocus && previouslyFocused?.isConnected) previouslyFocused.focus({ preventScroll: true });
    };
  }, [active, containerRef, restoreFocus]);
}
