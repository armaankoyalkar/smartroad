import { cn } from "@/utils/cn";

export interface ControlStyleOptions {
  invalid?: boolean;
  size?: "sm" | "md";
  /** Textareas: no fixed height, vertical padding instead. */
  multiline?: boolean;
  className?: string;
}

/** Shared look of Input, Textarea and Select. */
export function controlClasses({
  invalid = false,
  size = "md",
  multiline = false,
  className,
}: ControlStyleOptions = {}) {
  return cn(
    "block w-full rounded-lg border bg-navy-900/70 text-text placeholder:text-faint",
    "transition-[border-color,box-shadow] duration-150",
    "focus:outline-none focus:ring-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    multiline ? "min-h-24 px-3 py-2 text-sm" : size === "sm" ? "h-8 px-2.5 text-sm" : "h-10 px-3 text-sm",
    invalid
      ? "border-danger/70 focus:border-danger focus:ring-danger/30"
      : "border-navy-600 hover:border-navy-500 focus:border-cyan-400 focus:ring-cyan-400/30",
    className,
  );
}
