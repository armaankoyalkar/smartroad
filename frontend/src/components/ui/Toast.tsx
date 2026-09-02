import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X, type LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { IconButton } from "./Button";
import {
  ToastContext,
  type ToastApi,
  type ToastItem,
  type ToastOptions,
  type ToastTone,
} from "./ToastContext";

export type { ToastApi, ToastOptions, ToastTone } from "./ToastContext";

const TONES: Record<ToastTone, { icon: LucideIcon; iconClassName: string; borderClassName: string }> = {
  success: { icon: CircleCheck, iconClassName: "text-green-300", borderClassName: "border-success/40" },
  error: { icon: CircleAlert, iconClassName: "text-red-300", borderClassName: "border-danger/50" },
  warning: { icon: TriangleAlert, iconClassName: "text-amber-300", borderClassName: "border-warning/40" },
  info: { icon: Info, iconClassName: "text-cyan-300", borderClassName: "border-cyan-400/40" },
};

export interface ToastProviderProps {
  children: ReactNode;
  /** Most toasts shown at once (oldest are dropped). */
  max?: number;
  /** Default auto-dismiss time in ms (errors stay longer). */
  defaultDuration?: number;
}

export function ToastProvider({ children, max = 5, defaultDuration = 5000 }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const api = useMemo<ToastApi>(() => {
    const dismiss = (id: string) => setToasts((items) => items.filter((t) => t.id !== id));
    const show = (tone: ToastTone, title: ReactNode, options: ToastOptions = {}) => {
      counter.current += 1;
      const id = options.id ?? `toast-${counter.current}`;
      const item: ToastItem = {
        id,
        tone,
        title,
        description: options.description,
        duration: options.duration ?? (tone === "error" ? defaultDuration * 1.6 : defaultDuration),
        action: options.action,
      };
      setToasts((items) => [...items.filter((t) => t.id !== id), item].slice(-max));
      return id;
    };
    return {
      show,
      success: (title, options) => show("success", title, options),
      error: (title, options) => show("error", title, options),
      warning: (title, options) => show("warning", title, options),
      info: (title, options) => show("info", title, options),
      dismiss,
      clear: () => setToasts([]),
    };
  }, [defaultDuration, max]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4",
          "sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end",
        )}
      >
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => api.dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const config = TONES[toast.tone];
  const Icon = config.icon;

  useEffect(() => {
    if (toast.duration <= 0 || paused) return;
    const timer = window.setTimeout(onDismiss, toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.duration, paused, onDismiss]);

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-card border bg-navy-800/95 px-4 py-3 shadow-pop backdrop-blur",
        config.borderClassName,
      )}
    >
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.iconClassName)} aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-0.5 text-sm">
        <p className="font-medium text-text">{toast.title}</p>
        {toast.description && <p className="text-muted">{toast.description}</p>}
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              toast.action?.onClick();
              onDismiss();
            }}
            className="mt-1 text-xs font-medium text-cyan-300 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <IconButton
        label="Dismiss notification"
        size="xs"
        icon={<X className="h-3.5 w-3.5" aria-hidden="true" />}
        onClick={onDismiss}
        className="-mr-1.5 -mt-1"
      />
    </div>
  );
}
