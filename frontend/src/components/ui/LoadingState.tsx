import { cn } from "@/utils/cn";
import { Spinner, type SpinnerSize } from "./Spinner";

export interface LoadingStateProps {
  label?: string;
  size?: SpinnerSize;
  /** Render inline (no vertical padding). */
  inline?: boolean;
  className?: string;
}

/** Centred spinner with a visible label for any asynchronous view. */
export function LoadingState({
  label = "Loading",
  size = "md",
  inline = false,
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center gap-3 text-sm text-muted",
        inline ? "py-1" : "py-12",
        className,
      )}
    >
      <Spinner size={size} decorative className="text-cyan-400" />
      <span>{label}</span>
    </div>
  );
}

/** Full-viewport loader used while the session is being restored. */
export function FullPageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-navy-950 text-muted"
    >
      <Spinner size="lg" decorative className="text-cyan-400" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
