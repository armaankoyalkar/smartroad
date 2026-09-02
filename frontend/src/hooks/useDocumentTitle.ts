import { useEffect } from "react";
import { config } from "@/config";

/** Sets `document.title` to `"<title> · SmartRoad"` (or just the app name) while mounted. */
export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const previous = document.title;
    document.title = title ? `${title} · ${config.appName}` : config.appName;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
