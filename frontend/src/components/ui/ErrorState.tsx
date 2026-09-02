import type { ReactNode } from "react";
import { CircleAlert, RefreshCw, WifiOff } from "lucide-react";
import { getErrorMessage, isApiError } from "@/api/client";
import { cn } from "@/utils/cn";
import { Button } from "./Button";

export interface ErrorStateProps {
  /** The thrown value (ApiError or anything else). Used to pick a title and message. */
  error?: unknown;
  title?: ReactNode;
  /** Overrides the message derived from `error`. */
  message?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  /** Single-line variant for small panels. */
  compact?: boolean;
  className?: string;
}

function describe(error: unknown): { title: string; message: string; offline: boolean } {
  if (isApiError(error)) {
    if (error.isNetworkError)
      return { title: "Cannot reach the server", message: error.message, offline: true };
    if (error.isMlUnavailable)
      return { title: "ML service unavailable", message: error.message, offline: false };
    if (error.isNotFound) return { title: "Not found", message: error.message, offline: false };
    if (error.code === "FORBIDDEN") return { title: "No access", message: error.message, offline: false };
    if (error.code === "RATE_LIMITED")
      return { title: "Too many requests", message: error.message, offline: false };
    return { title: "Something went wrong", message: error.message, offline: false };
  }
  return { title: "Something went wrong", message: getErrorMessage(error), offline: false };
}

/** Error view for any asynchronous state, with an optional retry. Never swallows the message. */
export function ErrorState({
  error,
  title,
  message,
  onRetry,
  retryLabel = "Try again",
  compact = false,
  className,
}: ErrorStateProps) {
  const derived = describe(error);
  const Icon = derived.offline ? WifiOff : CircleAlert;

  if (compact) {
    return (
      <div
        role="alert"
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm",
          className,
        )}
      >
        <Icon className="h-4 w-4 shrink-0 text-red-300" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-red-100">{message ?? derived.message}</span>
        {onRetry && (
          <Button
            size="xs"
            variant="outline"
            onClick={onRetry}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            {retryLabel}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}
    >
      <span
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-full border border-danger/40 bg-danger/10 text-red-300"
      >
        <Icon className="h-6 w-6" />
      </span>
      <div className="space-y-1">
        <p className="text-base font-semibold text-text">{title ?? derived.title}</p>
        <p className="mx-auto max-w-md text-sm text-muted">{message ?? derived.message}</p>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          onClick={onRetry}
          leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
