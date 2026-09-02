import { createContext, type ReactNode } from "react";

export type ToastTone = "success" | "error" | "warning" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  /** Stable id: showing the same id again replaces the toast instead of stacking it. */
  id?: string;
  description?: ReactNode;
  /** Milliseconds before auto-dismiss; 0 keeps the toast until dismissed. */
  duration?: number;
  action?: ToastAction;
}

export interface ToastItem {
  id: string;
  tone: ToastTone;
  title: ReactNode;
  description?: ReactNode;
  duration: number;
  action?: ToastAction;
}

export interface ToastApi {
  show: (tone: ToastTone, title: ReactNode, options?: ToastOptions) => string;
  success: (title: ReactNode, options?: ToastOptions) => string;
  error: (title: ReactNode, options?: ToastOptions) => string;
  warning: (title: ReactNode, options?: ToastOptions) => string;
  info: (title: ReactNode, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
