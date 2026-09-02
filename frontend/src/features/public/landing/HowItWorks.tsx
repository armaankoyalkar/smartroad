import { STEPS } from "./landingContent";
import { Section } from "./Section";

/** Report, verify, resolve: the three steps every report goes through. */
export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      eyebrow="How it works"
      title="Report, verify, resolve"
      description="Three steps, each visible to the reporter. Status changes are made by administrators only and every change is kept in the report's history."
      centered
      className="bg-navy-900/40"
    >
      <ol className="relative grid gap-6 md:grid-cols-3">
        <span
          aria-hidden="true"
          className="absolute left-[16.6%] right-[16.6%] top-9 hidden h-px bg-gradient-to-r from-cyan-400/0 via-cyan-400/60 to-cyan-400/0 md:block"
        />
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={step.title} className="relative flex flex-col items-center text-center">
              <span className="relative z-10 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border border-cyan-400/40 bg-navy-950 text-cyan-300 shadow-glow">
                <Icon className="h-7 w-7" aria-hidden="true" />
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400 text-xs font-semibold text-navy-950">
                  {index + 1}
                </span>
              </span>
              <h3 className="mt-5 text-lg font-semibold text-text">{step.title}</h3>
              <p className="mt-2 max-w-xs text-sm text-muted">{step.description}</p>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
