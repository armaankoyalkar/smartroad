import { useState } from "react";
import { FlaskConical, Play } from "lucide-react";
import { getErrorMessage } from "@/api/client";
import { useRefreshRisk } from "@/api/mutations";
import { useRiskDistribution } from "@/api/queries";
import { RiskDistributionBars } from "@/components/charts/RiskDistributionBars";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { RISK_LEVELS } from "@/constants/enums";
import { isMlDown } from "@/features/admin/mlErrors";
import { useMeta } from "@/meta/useMeta";
import type { RiskRefreshResult } from "@/types/api";
import { formatDateTime, formatNumber } from "@/utils/format";
import { MlNotice } from "./MlStates";

/**
 * Stored estimates by level plus the batch job (POST /api/ml/risk/refresh) that estimates every
 * non-rejected incident. Confirmation first, a progress state while it runs, then the summary.
 */
export function RiskDistributionSection({ className }: { className?: string }) {
  const meta = useMeta();
  const distribution = useRiskDistribution();
  const refresh = useRefreshRisk();
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<RiskRefreshResult | null>(null);

  const run = async () => {
    setConfirmError(null);
    try {
      const result = await refresh.mutateAsync();
      setLastRun(result);
      setConfirming(false);
    } catch (error) {
      setConfirmError(getErrorMessage(error));
    }
  };

  let body;
  if (distribution.isLoading) {
    body = (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  } else if (distribution.error) {
    body = isMlDown(distribution.error) ? (
      <MlNotice error={distribution.error} onRetry={() => void distribution.refetch()} />
    ) : (
      <ErrorState compact error={distribution.error} onRetry={() => void distribution.refetch()} />
    );
  } else if (distribution.data) {
    const d = distribution.data;
    body = (
      <div className="space-y-4">
        <RiskDistributionBars distribution={d} />
        <p className="text-xs text-muted">
          {formatNumber(d.estimated)} of {formatNumber(d.total)} incidents have a stored estimate
          {d.modelVersions.length > 0 && ` (model ${d.modelVersions.join(", ")})`}
          {d.lastEstimatedAt ? `; last estimated ${formatDateTime(d.lastEstimatedAt)}.` : "."}
        </p>
        {d.isDemoModel && (
          <Alert tone="warning" icon={FlaskConical}>
            Stored estimates come from the demo model.
          </Alert>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader
        title="Stored estimates"
        description="Risk levels stored on incidents, computed from historical data."
        as="h2"
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setConfirming(true)}
            loading={refresh.isPending}
            loadingText="Estimating"
            leftIcon={<Play className="h-4 w-4" aria-hidden="true" />}
          >
            Run risk estimation for all incidents
          </Button>
        }
      />
      {refresh.isPending && (
        <p role="status" className="mb-3 text-xs text-cyan-300">
          Estimating every non-rejected incident (up to 5000, newest first). This can take a moment.
        </p>
      )}
      {lastRun && !refresh.isPending && (
        <Alert tone="success" title="Batch estimation finished" className="mb-4">
          {formatNumber(lastRun.estimated)} estimated, {formatNumber(lastRun.skipped)} skipped with model{" "}
          {lastRun.modelVersion} at {formatDateTime(lastRun.finishedAt)}.{" "}
          {RISK_LEVELS.map(
            (level) => `${meta.label("riskLevel", level)}: ${formatNumber(lastRun.byLevel[level] ?? 0)}`,
          ).join(" · ")}
          .
        </Alert>
      )}
      {refresh.error && !confirming && !refresh.isPending && (
        <MlNotice error={refresh.error} className="mb-4" />
      )}
      {body}
      <ConfirmDialog
        open={confirming}
        onClose={() => {
          if (!refresh.isPending) {
            setConfirming(false);
            setConfirmError(null);
          }
        }}
        onConfirm={run}
        title="Estimate risk for all incidents?"
        description="Every non-rejected incident is sent to the model and its stored estimate is replaced."
        confirmLabel="Run estimation"
        loading={refresh.isPending}
        error={confirmError}
      />
    </Card>
  );
}
