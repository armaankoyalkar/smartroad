import { Activity, RefreshCw, ServerOff } from "lucide-react";
import { getErrorMessage } from "@/api/client";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { classifyMlError } from "@/features/admin/mlErrors";
import { cn } from "@/utils/cn";

const UNAVAILABLE_TITLE = "ML service unavailable";
const NOT_TRAINED_TITLE = "Model not trained";
const TRAINING_HINT =
  "The ML service is running but has no trained artifacts. Run the training pipeline (python -m training.run_pipeline in the ml/ directory) and try again.";

export interface MlNoticeProps {
  error: unknown;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

/** Inline notice for a failed ML call: never an error page, because everything else keeps working. */
export function MlNotice({ error, onRetry, isRetrying = false, className }: MlNoticeProps) {
  const kind = classifyMlError(error);
  const retry = onRetry ? (
    <Button
      size="xs"
      variant="outline"
      onClick={onRetry}
      loading={isRetrying}
      leftIcon={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
    >
      Retry
    </Button>
  ) : undefined;

  if (kind === "unavailable") {
    return (
      <Alert tone="warning" title={UNAVAILABLE_TITLE} icon={ServerOff} action={retry} className={className}>
        {getErrorMessage(error, "The ML service is not reachable.")} Reporting and management continue to
        work.
      </Alert>
    );
  }
  if (kind === "not-trained") {
    return (
      <Alert tone="warning" title={NOT_TRAINED_TITLE} icon={Activity} action={retry} className={className}>
        {TRAINING_HINT}
      </Alert>
    );
  }
  return <ErrorState compact error={error} onRetry={onRetry} className={className} />;
}

export interface MlUnavailableStateProps {
  error: unknown;
  onRetry?: () => void;
  isRetrying?: boolean;
  /** When the last successful fetch is known, say so instead of inventing numbers. */
  lastFetchedAt?: string | null;
  className?: string;
}

/** Whole-section state for the ML view when model-info cannot be loaded. */
export function MlUnavailableState({
  error,
  onRetry,
  isRetrying = false,
  lastFetchedAt,
  className,
}: MlUnavailableStateProps) {
  const kind = classifyMlError(error);
  const notTrained = kind === "not-trained";
  const Icon = notTrained ? Activity : ServerOff;
  return (
    <Card className={cn("animate-fade-in", className)} padding="lg">
      <div role="alert" className="flex flex-col items-center gap-4 py-6 text-center">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-warning/40 bg-warning/10 text-amber-300"
        >
          <Icon className="h-6 w-6" />
        </span>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-text">
            {kind === "unavailable"
              ? UNAVAILABLE_TITLE
              : notTrained
                ? NOT_TRAINED_TITLE
                : "Model information failed to load"}
          </h2>
          <p className="mx-auto max-w-lg text-sm text-muted">
            {notTrained
              ? TRAINING_HINT
              : `${getErrorMessage(error)} Incident reporting, management and the map keep working; only risk estimates and hotspots need the ML service.`}
          </p>
          {lastFetchedAt && (
            <p className="text-xs text-faint">
              Last successful load: {lastFetchedAt}. Nothing is shown from memory.
            </p>
          )}
        </div>
        {onRetry && (
          <Button
            variant="secondary"
            onClick={onRetry}
            loading={isRetrying}
            leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
          >
            Try again
          </Button>
        )}
      </div>
    </Card>
  );
}
