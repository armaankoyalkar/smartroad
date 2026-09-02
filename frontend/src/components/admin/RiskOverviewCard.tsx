import { ArrowUpRight, FlaskConical } from "lucide-react";
import { useRiskDistribution } from "@/api/queries";
import { RiskDistributionBars } from "@/components/charts/RiskDistributionBars";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { isMlDown } from "@/features/admin/mlErrors";
import { formatDateTime, formatNumber } from "@/utils/format";
import { MlNotice } from "./MlStates";

/** Stored risk estimates by level (GET /api/ml/risk/distribution) with the model version and demo notice. */
export function RiskOverviewCard() {
  const query = useRiskDistribution();
  const distribution = query.data;

  let body;
  if (query.isLoading) {
    body = (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  } else if (query.error) {
    body = isMlDown(query.error) ? (
      <MlNotice error={query.error} onRetry={() => void query.refetch()} isRetrying={query.isFetching} />
    ) : (
      <ErrorState compact error={query.error} onRetry={() => void query.refetch()} />
    );
  } else if (distribution) {
    body = (
      <div className="space-y-4">
        <RiskDistributionBars distribution={distribution} />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <dt className="text-muted">Estimated</dt>
          <dd className="tabular text-right text-text">
            {formatNumber(distribution.estimated)} of {formatNumber(distribution.total)}
          </dd>
          <dt className="text-muted">Without estimate</dt>
          <dd className="tabular text-right text-text">{formatNumber(distribution.byLevel.NONE ?? 0)}</dd>
          <dt className="text-muted">Model version</dt>
          <dd className="text-right text-text">
            {distribution.modelVersions.length ? distribution.modelVersions.join(", ") : "none yet"}
          </dd>
          <dt className="text-muted">Last estimated</dt>
          <dd className="text-right text-text">
            {distribution.lastEstimatedAt ? formatDateTime(distribution.lastEstimatedAt) : "never"}
          </dd>
        </dl>
        {distribution.isDemoModel && (
          <Alert tone="warning" icon={FlaskConical}>
            Estimates come from the demo model trained on generated data.
          </Alert>
        )}
      </div>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Risk overview"
        description="Estimates from historical data stored on incidents."
        actions={
          <LinkButton
            to="/admin/risk"
            size="xs"
            variant="ghost"
            rightIcon={<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Risk estimation
          </LinkButton>
        }
      />
      {body}
    </Card>
  );
}
