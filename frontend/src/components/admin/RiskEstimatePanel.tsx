import { useEffect, useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useIncidentRisk } from "@/api/queries";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { RiskBadge } from "@/components/ui/SemanticBadges";
import { Skeleton } from "@/components/ui/Skeleton";
import type { FeatureSpec, Incident, IncidentRiskParams } from "@/types/api";
import { formatDateTime } from "@/utils/format";
import { MlNotice } from "./MlStates";
import { RiskContextForm, type RiskOverrides } from "./RiskContextForm";
import { RiskFeatureList } from "./RiskFeatureList";
import { RiskResultCard } from "./RiskResultCard";

export interface RiskEstimatePanelProps {
  incident: Incident;
  specs?: readonly FeatureSpec[];
  className?: string;
}

/**
 * On-demand estimate for one incident (GET /api/ml/incidents/:id/risk): derived features with
 * "assumed" markers, optional context overrides (query parameters, never stored), re-estimate
 * with `refresh=true`, and an inline notice when the ML service is down.
 */
export function RiskEstimatePanel({ incident, specs, className }: RiskEstimatePanelProps) {
  const [requested, setRequested] = useState(false);
  const [refresh, setRefresh] = useState(false);
  const [overrides, setOverrides] = useState<RiskOverrides>({});
  const [adjusting, setAdjusting] = useState(false);
  const contextId = useId();
  const queryClient = useQueryClient();

  const params: IncidentRiskParams = { ...overrides, refresh: refresh || undefined };
  const query = useIncidentRisk(incident.id, params, { enabled: requested });
  const hasOverrides = Object.keys(overrides).length > 0;
  const stored = incident.riskEstimate ?? null;

  // An estimate without overrides is stored on the incident: refresh the detail so the facts agree.
  const estimatedVersion = query.data?.modelVersion;
  useEffect(() => {
    if (!estimatedVersion || hasOverrides) return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.incidents.detail(incident.id) });
  }, [estimatedVersion, hasOverrides, incident.id, queryClient]);

  const estimateNow = () => {
    setRequested(true);
    if (query.data || query.error) void query.refetch();
  };
  const reEstimate = () => {
    setRequested(true);
    if (refresh) void query.refetch();
    else setRefresh(true);
  };

  return (
    <Card className={className}>
      <CardHeader
        title="Risk estimate"
        description="Estimate from historical data for this incident's context. Not a prediction that anything will happen."
        as="h2"
        actions={
          <>
            {!query.data && (
              <Button
                size="sm"
                onClick={estimateNow}
                loading={query.isFetching}
                leftIcon={<Activity className="h-4 w-4" aria-hidden="true" />}
              >
                Estimate risk
              </Button>
            )}
            {query.data && (
              <Button
                size="sm"
                variant="secondary"
                onClick={reEstimate}
                loading={query.isFetching}
                leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
              >
                Re-estimate
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              aria-expanded={adjusting}
              aria-controls={contextId}
              onClick={() => setAdjusting((v) => !v)}
              leftIcon={<SlidersHorizontal className="h-4 w-4" aria-hidden="true" />}
            >
              Adjust context
            </Button>
          </>
        }
      />

      <div
        id={contextId}
        hidden={!adjusting}
        className="mb-4 rounded-lg border border-navy-600 bg-navy-900/40 p-3"
      >
        <RiskContextForm
          value={overrides}
          specs={specs}
          disabled={query.isFetching}
          onApply={(next) => {
            setOverrides(next);
            setRequested(true);
          }}
        />
      </div>

      {!requested && (
        <div className="space-y-2 text-sm text-muted">
          {stored ? (
            <p className="flex flex-wrap items-center gap-2">
              Stored estimate: <RiskBadge level={stored.level} size="sm" />
              <span className="text-xs">
                model {stored.modelVersion} · {formatDateTime(stored.estimatedAt)}
              </span>
            </p>
          ) : (
            <p>No estimate has been computed for this incident yet.</p>
          )}
          <p className="text-xs">
            Press “Estimate risk” to derive the feature vector from this report and ask the model.
          </p>
        </div>
      )}

      {requested && query.isLoading && (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      )}

      {requested && query.isError && !query.isLoading && (
        <MlNotice error={query.error} onRetry={() => void query.refetch()} isRetrying={query.isFetching} />
      )}

      {query.data && !query.isError && (
        <RiskResultCard estimate={query.data} specs={specs}>
          <RiskFeatureList
            features={query.data.features}
            assumed={query.data.assumedFeatures}
            specs={specs}
          />
          {hasOverrides && (
            <p className="text-xs text-amber-300">
              Context overrides are applied to this estimate; it is not stored on the incident.
            </p>
          )}
        </RiskResultCard>
      )}
    </Card>
  );
}
