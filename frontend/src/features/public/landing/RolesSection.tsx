import { Check, ShieldCheck, User } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ROLE_CARDS } from "./landingContent";
import { Section } from "./Section";

/** Citizen versus administrator: what each role can do. */
export function RolesSection() {
  return (
    <Section
      id="roles"
      eyebrow="Roles"
      title="Two roles, one record of every incident"
      description="Visitors can browse the map and the public figures without an account. Reporting needs a citizen account; verification and analytics need an administrator account created by the project team."
    >
      <div className="grid gap-6 md:grid-cols-2">
        {ROLE_CARDS.map((role, index) => {
          const admin = index === 1;
          const Icon = admin ? ShieldCheck : User;
          return (
            <Card key={role.title} padding="lg" className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-text">{role.title}</h3>
                  <p className="text-xs text-muted">{role.description}</p>
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted">
                {role.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-2">
                {admin ? (
                  <LinkButton to="/admin/login" variant="outline">
                    Administrator sign-in
                  </LinkButton>
                ) : (
                  <LinkButton to="/register" variant="secondary">
                    Create a citizen account
                  </LinkButton>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}
