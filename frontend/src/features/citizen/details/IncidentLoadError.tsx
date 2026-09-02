import { FileQuestion, ShieldOff } from "lucide-react";
import { isApiError } from "@/api/client";
import { LinkButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

export interface IncidentLoadErrorProps {
  error: unknown;
  onRetry: () => void;
}

/** Not-found, forbidden and generic failure states for the citizen incident pages. */
export function IncidentLoadError({ error, onRetry }: IncidentLoadErrorProps) {
  const back = (
    <LinkButton to="/app/reports" variant="secondary">
      Back to my reports
    </LinkButton>
  );
  if (isApiError(error) && (error.isNotFound || error.isValidation)) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="Report not found"
        description="This report does not exist, was removed, or is not visible to your account."
        action={back}
      />
    );
  }
  if (isApiError(error) && error.code === "FORBIDDEN") {
    return (
      <EmptyState
        icon={ShieldOff}
        title="You cannot open this report"
        description={error.message}
        action={back}
      />
    );
  }
  return <ErrorState error={error} onRetry={onRetry} />;
}
