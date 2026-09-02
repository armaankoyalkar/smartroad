import { FlaskConical, Info } from "lucide-react";
import { useModelInfo } from "@/api/queries";
import { DatasetCard } from "@/components/admin/DatasetCard";
import { MetricsTable } from "@/components/admin/MetricsTable";
import { MlUnavailableState } from "@/components/admin/MlStates";
import { ModelComparisonTable } from "@/components/admin/ModelComparisonTable";
import { ModelSummary } from "@/components/admin/ModelSummary";
import { ResearchModelPanel } from "@/components/admin/ResearchModelPanel";
import { RiskDistributionSection } from "@/components/admin/RiskDistributionSection";
import { RiskEstimateForm } from "@/components/admin/RiskEstimateForm";
import { ClassDistributionChart } from "@/components/charts/ClassDistributionChart";
import { ConfusionMatrixHeatmap } from "@/components/charts/ConfusionMatrixHeatmap";
import { FeatureImportanceChart } from "@/components/charts/FeatureImportanceChart";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { BRAND } from "@/constants/colors";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { formatDateTime } from "@/utils/format";

function ModelSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2" role="status" aria-label="Loading model information">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-64 rounded-card" />
      ))}
    </div>
  );
}

export default function RiskEstimationPage() {
  useDocumentTitle("Risk estimation");
  const query = useModelInfo();
  const info = query.data;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Insights"
        title="Risk estimation"
        description="The model behind the risk levels: its dataset, evaluation and a form to try an estimate. Estimates come from historical data and are not predictions of what will happen."
        titleAddon={
          info?.isDemoModel ? (
            <Badge color={BRAND.warning} icon={<FlaskConical className="h-3 w-3" aria-hidden="true" />}>
              Demo model
            </Badge>
          ) : undefined
        }
      />

      {query.isLoading && <ModelSkeleton />}

      {query.isError && !query.isLoading && (
        <MlUnavailableState
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
          lastFetchedAt={query.dataUpdatedAt ? formatDateTime(new Date(query.dataUpdatedAt)) : null}
        />
      )}

      {info && !query.isError && (
        <>
          <Alert tone="info" icon={Info}>
            {info.disclaimer}
          </Alert>

          <div className="grid gap-4 lg:grid-cols-2">
            <DatasetCard dataset={info.dataset} />
            <ModelSummary info={info} />
            <MetricsTable metrics={info.metrics} classes={info.classes} />
            <ModelComparisonTable comparison={info.comparison} shippedModel={info.modelName} />
            <Card>
              <CardHeader
                title="Confusion matrix"
                description="Where the shipped model agrees with the labels on the test split."
                as="h2"
              />
              <ConfusionMatrixHeatmap matrix={info.confusionMatrix} />
            </Card>
            <FeatureImportanceChart items={info.featureImportance} specs={info.features} />
            <ClassDistributionChart distribution={info.classDistribution} classes={info.classes} />
            <ResearchModelPanel research={info.researchModel} />
          </div>

          <RiskEstimateForm specs={info.features} />
        </>
      )}

      <RiskDistributionSection />
    </div>
  );
}
