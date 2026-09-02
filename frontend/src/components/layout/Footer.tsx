import { Link } from "react-router";
import { PROJECT } from "@/constants/project";
import { cn } from "@/utils/cn";
import { Logo } from "./Logo";

const LINK =
  "rounded transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400";

/** Site footer: project identity, team, guide, OpenStreetMap attribution and the academic note. */
export function Footer({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t border-navy-600 bg-navy-950", className)}>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-md text-sm text-muted">{PROJECT.fullTitle}</p>
          <p className="max-w-md text-xs text-faint">{PROJECT.academicNote}</p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Team</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {PROJECT.team.map((member) => (
              <li key={member.name} className="text-text">
                {member.name} <span className="text-faint">· {member.role}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">
            Project guide: <span className="text-text">{PROJECT.guide}</span>
          </p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Explore</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted">
            <li>
              <Link to="/map" className={LINK}>
                Incident map
              </Link>
            </li>
            <li>
              <Link to="/register" className={LINK}>
                Create a citizen account
              </Link>
            </li>
            <li>
              <Link to="/login" className={LINK}>
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/admin/login" className={LINK}>
                Administrator sign-in
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-600/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-faint sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            {PROJECT.name} {PROJECT.year}. Academic prototype.
          </p>
          <p>
            Base map data &copy;{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="text-muted underline-offset-2 hover:text-text hover:underline"
            >
              OpenStreetMap contributors
            </a>
            . Tiles are a base map, not a traffic feed.
          </p>
        </div>
      </div>
    </footer>
  );
}

/** One-line footer for the signed-in areas. */
export function CompactFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("px-4 py-4 text-xs text-faint sm:px-6 lg:px-8", className)}>
      {PROJECT.name} academic prototype. Base map data &copy;{" "}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="underline-offset-2 hover:text-text hover:underline"
      >
        OpenStreetMap contributors
      </a>
      .
    </footer>
  );
}
