import { GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { PROJECT } from "@/constants/project";
import { PROJECT_PEOPLE } from "./landingContent";
import { Section } from "./Section";

/** Team, guide and the academic framing of the project. */
export function ProjectSection() {
  const rows = [
    { label: "Project lead", value: PROJECT_PEOPLE.lead },
    { label: "Team members", value: PROJECT_PEOPLE.members.join(" and ") },
    { label: "Project guide", value: PROJECT_PEOPLE.guide },
    { label: "Acceptance", value: PROJECT_PEOPLE.acceptance },
  ];
  return (
    <Section id="project" eyebrow="The project" title={PROJECT.fullTitle} description={PROJECT.academicNote}>
      <Card padding="lg" className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
        >
          <GraduationCap className="h-6 w-6" />
        </span>
        <div className="space-y-4">
          <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {rows.map((row) => (
              <div key={row.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{row.label}</dt>
                <dd className="mt-0.5 text-sm text-text">{row.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-muted">
            Final-year engineering project, academic prototype ({PROJECT.year}). The administrator role is
            played by the team in demonstrations; SmartRoad is not an official channel for reporting road
            incidents.
          </p>
        </div>
      </Card>
    </Section>
  );
}
