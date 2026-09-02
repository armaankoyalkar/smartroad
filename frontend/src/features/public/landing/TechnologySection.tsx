import { TECHNOLOGIES } from "./landingContent";
import { Section } from "./Section";

/** The stack, one line per layer. */
export function TechnologySection() {
  return (
    <Section
      id="technology"
      eyebrow="Technology"
      title="Built with a standard, open stack"
      description="Four deployable parts: the React single-page application, the Express API, MongoDB and a Python service for the machine-learning parts."
      className="bg-navy-900/40"
    >
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TECHNOLOGIES.map((tech) => {
          const Icon = tech.icon;
          return (
            <li key={tech.name} className="surface flex items-start gap-3 p-4">
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-navy-600 bg-navy-900 text-cyan-300"
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text">{tech.name}</p>
                <p className="mt-0.5 text-xs text-muted">{tech.role}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
