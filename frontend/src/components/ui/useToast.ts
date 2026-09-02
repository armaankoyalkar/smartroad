import { useContext } from "react";
import { ToastContext, type ToastApi } from "./ToastContext";

/** Toast API (stable object: safe to list in effect dependencies). */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside <ToastProvider>");
  return context;
}
