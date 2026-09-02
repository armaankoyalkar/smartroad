import { ArrowLeft, LayoutDashboard, Map as MapIcon } from "lucide-react";
import { useLocation } from "react-router";
import { useAuth } from "@/auth/useAuth";
import { LinkButton } from "@/components/ui/Button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

/** 404 page for unknown routes (rendered inside PublicLayout). */
export default function NotFoundPage() {
  useDocumentTitle("Page not found");
  const { isAuthenticated, isAdmin } = useAuth();
  const { pathname } = useLocation();

  return (
    <section className="city-grid relative flex flex-1 items-center justify-center px-4 py-20 sm:px-6">
      <div className="glow-spot pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-xl animate-slide-up text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Error 404</p>
        <h1 className="tabular mt-3 text-6xl font-semibold tracking-tight text-text sm:text-7xl">404</h1>
        <p className="mt-4 text-xl font-medium text-text">This road does not exist</p>
        <p className="mt-2 text-sm text-muted">
          There is no page at{" "}
          <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-xs text-text">{pathname}</code>. It
          may have moved, or the link may be wrong.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <LinkButton to="/" leftIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}>
            Back to home
          </LinkButton>
          <LinkButton
            to="/map"
            variant="secondary"
            leftIcon={<MapIcon className="h-4 w-4" aria-hidden="true" />}
          >
            Open the map
          </LinkButton>
          {isAuthenticated && (
            <LinkButton
              to={isAdmin ? "/admin" : "/app"}
              variant="ghost"
              leftIcon={<LayoutDashboard className="h-4 w-4" aria-hidden="true" />}
            >
              Go to my dashboard
            </LinkButton>
          )}
        </div>
      </div>
    </section>
  );
}
