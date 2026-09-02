import type { ReactNode } from "react";
import { Database, FlaskConical } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Card, CardHeader } from "@/components/ui/Card";
import type { DatasetCard as DatasetCardData } from "@/types/api";
import { formatDate, formatNumber } from "@/utils/format";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-navy-600/50 py-2 last:border-b-0 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-faint">{label}</dt>
      <dd className="min-w-0 text-sm text-text">{children}</dd>
    </div>
  );
}

/** The dataset card behind the shipped model (name, provenance, licence, size, target, coverage, limitations). */
export function DatasetCard({ dataset, className }: { dataset: DatasetCardData; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader title="Dataset" description={dataset.name} as="h2" />
      {dataset.isDemoData && (
        <Alert tone="warning" icon={FlaskConical} title="DEMO DATA" className="mb-4">
          This dataset was generated for development and demonstration. Metrics computed on it say nothing
          about real roads.
        </Alert>
      )}
      <dl>
        <Row label="Source">
          {dataset.url ? (
            <a
              href={dataset.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-cyan-300 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
            >
              {dataset.source}
            </a>
          ) : (
            dataset.source
          )}
        </Row>
        {dataset.accessDate && <Row label="Accessed">{formatDate(dataset.accessDate)}</Row>}
        <Row label="Licence">{dataset.licence}</Row>
        <Row label="Records">
          <span className="tabular">
            {formatNumber(dataset.records)} total · {formatNumber(dataset.trainRecords)} train ·{" "}
            {formatNumber(dataset.testRecords)} test
          </span>
        </Row>
        <Row label="Target">{dataset.targetDefinition}</Row>
        <Row label="Geographic coverage">{dataset.geographicCoverage}</Row>
        <Row label="Temporal coverage">{dataset.temporalCoverage}</Row>
        <Row label="Limitations">
          {dataset.limitations.length === 0 ? (
            <span className="text-muted">None recorded</span>
          ) : (
            <ul className="list-disc space-y-1 pl-4 text-muted">
              {dataset.limitations.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}
        </Row>
      </dl>
      <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-faint">
        <Database className="h-3 w-3" aria-hidden="true" />
        Every number on this page comes from metrics.json written by the training run.
      </p>
    </Card>
  );
}
