import { MessageSquareWarning, Route } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Section } from "./Section";

/** Why scattered incident reports fail, and what SmartRoad does about it. */
export function ProblemSection() {
  return (
    <Section
      id="purpose"
      eyebrow="Purpose"
      title="Reports that are scattered cannot be verified, tracked or studied"
      description="Road hazards are reported by phone, on paper, on social media and in unrelated apps. Nobody can confirm them, see what happened next, or notice that the same spot keeps coming up."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Card padding="lg" className="space-y-4">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-warning/40 bg-warning/10 text-amber-300"
          >
            <MessageSquareWarning className="h-5 w-5" />
          </span>
          <h3 className="text-lg font-semibold text-text">The problem</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              Reports arrive through channels that do not talk to each other, often without a precise
              location.
            </li>
            <li>The person who reported a hazard rarely learns whether anyone looked at it.</li>
            <li>
              Without one record of past incidents, there is no basis for deciding where attention is needed.
            </li>
          </ul>
        </Card>
        <Card padding="lg" className="space-y-4 border-cyan-400/30">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
          >
            <Route className="h-5 w-5" />
          </span>
          <h3 className="text-lg font-semibold text-text">What SmartRoad does</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li>One web platform where citizens report incidents with coordinates and a photo.</li>
            <li>A verification workflow with a visible status, priority and history for every report.</li>
            <li>
              A shared map, database-driven analytics, DBSCAN hotspot clusters of reported incidents and a
              documented risk-estimation model for administrators.
            </li>
          </ul>
        </Card>
      </div>
    </Section>
  );
}
