import { ClipboardList, Map as MapIcon, User, type LucideIcon } from "lucide-react";
import { CardLink } from "@/components/ui/Card";

interface QuickLink {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const LINKS: readonly QuickLink[] = [
  {
    to: "/map",
    title: "Incident map",
    description: "See reported incidents near you, filtered by category, status and severity.",
    icon: MapIcon,
  },
  {
    to: "/app/reports",
    title: "My reports",
    description: "Every report you have filed, with its current status and history.",
    icon: ClipboardList,
  },
  {
    to: "/app/profile",
    title: "Profile",
    description: "Update your name and phone number or change your password.",
    icon: User,
  },
];

/** Three navigation cards under the dashboard content. */
export function QuickLinks() {
  return (
    <nav aria-label="Quick links" className="grid gap-3 sm:grid-cols-3">
      {LINKS.map(({ to, title, description, icon: Icon }) => (
        <CardLink key={to} to={to} padding="sm" className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-cyan-300"
          >
            <Icon className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-text">{title}</span>
            <span className="mt-0.5 block text-xs text-muted">{description}</span>
          </span>
        </CardLink>
      ))}
    </nav>
  );
}
