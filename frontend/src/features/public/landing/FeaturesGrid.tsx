import { Card } from "@/components/ui/Card";
import { FEATURES } from "./landingContent";
import { Section } from "./Section";

/** The six capabilities, each described as it is implemented. */
export function FeaturesGrid() {
  return (
    <Section
      id="features"
      eyebrow="Key features"
      title="What the platform includes"
      description="Reporting and management are the core; the map, analytics and machine-learning parts read from the same incident records."
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <li key={feature.title}>
              <Card className="flex h-full flex-col gap-3" interactive>
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-navy-600 bg-navy-900 text-cyan-300"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-base font-semibold text-text">{feature.title}</h3>
                <p className="text-sm text-muted">{feature.description}</p>
                {feature.note && (
                  <p className="mt-auto pt-2 text-xs font-medium uppercase tracking-wide text-faint">
                    {feature.note}
                  </p>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
