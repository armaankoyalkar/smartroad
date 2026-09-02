import { Suspense } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "@/auth/useAuth";
import { LinkButton } from "@/components/ui/Button";
import { PageSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/utils/cn";
import { Footer } from "./Footer";
import { Logo } from "./Logo";
import { SkipLink } from "./SkipLink";
import { UserMenu } from "./UserMenu";

/** Height of the public top bar; full-height pages use `min-h-[calc(100dvh-var(--public-nav-height))]`. */
const NAV_HEIGHT = "4rem";

/**
 * Landing, auth and public map pages: sticky glass top bar, footer.
 * The /map route hides the footer so the map can take the full viewport.
 */
export function PublicLayout() {
  const { status, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();
  const fullHeight = location.pathname === "/map";

  return (
    <div
      className="flex min-h-dvh flex-col bg-navy-950"
      style={{ "--public-nav-height": NAV_HEIGHT } as React.CSSProperties}
    >
      <SkipLink />
      <header className="glass-strong sticky top-0 z-40 h-16 border-b border-white/10">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
            <NavLink
              to="/map"
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400",
                  isActive ? "text-text" : "text-muted hover:text-text",
                )
              }
            >
              Map
            </NavLink>
            {status === "loading" ? (
              <Skeleton className="h-9 w-24 rounded-full" />
            ) : isAuthenticated ? (
              <>
                <LinkButton
                  to={isAdmin ? "/admin" : "/app"}
                  variant="ghost"
                  size="sm"
                  className="hidden sm:inline-flex"
                >
                  Dashboard
                </LinkButton>
                <UserMenu compact />
              </>
            ) : (
              <>
                <LinkButton to="/login" variant="ghost" size="sm">
                  Sign in
                </LinkButton>
                <LinkButton to="/register" size="sm">
                  Register
                </LinkButton>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      {!fullHeight && <Footer />}
    </div>
  );
}
