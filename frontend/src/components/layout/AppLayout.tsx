import { Suspense } from "react";
import { LogOut } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "@/auth/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/useToast";
import { cn } from "@/utils/cn";
import { CompactFooter } from "./Footer";
import { Logo } from "./Logo";
import { CITIZEN_NAV } from "./navItems";
import { SideNavLink } from "./SideNavLink";
import { SkipLink } from "./SkipLink";
import { UserMenu } from "./UserMenu";

/**
 * Citizen area: side navigation on lg+, bottom navigation on phones, slightly lighter surface
 * than the public pages for long reading sessions. Routes below are guarded by RequireAuth.
 */
export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const signOut = () => {
    logout();
    toast.info("You have signed out.");
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-dvh bg-navy-900 text-text">
      <SkipLink />
      <aside className="sticky top-0 hidden h-dvh w-64 flex-col border-r border-navy-600 bg-navy-950 lg:flex">
        <div className="flex h-16 items-center border-b border-navy-600 px-5">
          <Logo to="/app" />
        </div>
        <nav aria-label="Citizen navigation" className="flex-1 space-y-1 px-3 py-4">
          {CITIZEN_NAV.map((item) => (
            <SideNavLink key={item.to} item={item} />
          ))}
        </nav>
        {user && (
          <div className="space-y-3 border-t border-navy-600 p-3">
            <div className="flex items-center gap-3 px-1">
              <Avatar name={user.name} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text">{user.name}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              onClick={signOut}
              leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
            >
              Sign out
            </Button>
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-navy-600 bg-navy-950/90 px-4 backdrop-blur lg:hidden">
          <Logo size={24} to="/app" />
          <UserMenu compact />
        </header>
        <main
          id="main"
          tabIndex={-1}
          className="flex-1 px-4 py-6 pb-24 outline-none sm:px-6 lg:px-8 lg:py-8 lg:pb-8"
        >
          <div className="mx-auto w-full max-w-6xl">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <CompactFooter className="hidden lg:block" />
      </div>

      <nav
        aria-label="Citizen navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-navy-600 bg-navy-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {CITIZEN_NAV.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-150",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-cyan-400",
                  isActive ? "text-cyan-300" : "text-muted hover:text-text",
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {item.shortLabel ?? item.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
