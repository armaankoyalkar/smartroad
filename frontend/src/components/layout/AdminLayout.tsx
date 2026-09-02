import { Suspense, useEffect, useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Button, IconButton } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { cn } from "@/utils/cn";
import { CompactFooter } from "./Footer";
import { Logo } from "./Logo";
import { ADMIN_NAV } from "./navItems";
import { SideNavLink } from "./SideNavLink";
import { SkipLink } from "./SkipLink";
import { UserMenu } from "./UserMenu";

const SIDEBAR_KEY = "smartroad.admin.sidebar";
/** Where the search shortcut goes; the incident page may read `focus=q` to focus its search box. */
const SEARCH_TARGET = "/admin/incidents?focus=q";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_KEY) === "collapsed";
  } catch {
    return false;
  }
}

function NavSections({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <>
      {ADMIN_NAV.map((section) => (
        <div key={section.title}>
          <p
            className={cn(
              "px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-faint",
              collapsed && "sr-only",
            )}
          >
            {section.title}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => (
              <SideNavLink key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/**
 * Admin area: collapsible side navigation (remembered per browser), a drawer on small screens,
 * a top bar with the search shortcut (Ctrl/Cmd+K) and the user menu.
 */
export function AdminLayout() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, collapsed ? "collapsed" : "expanded");
    } catch {
      /* private mode: the preference just does not persist */
    }
  }, [collapsed]);

  // Close the drawer when the route changes (state adjusted during render).
  const [seenPath, setSeenPath] = useState(location.pathname);
  if (seenPath !== location.pathname) {
    setSeenPath(location.pathname);
    if (drawerOpen) setDrawerOpen(false);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        navigate(SEARCH_TARGET);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  return (
    <div className="flex min-h-dvh bg-navy-950 text-text">
      <SkipLink />
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh flex-col border-r border-navy-600 bg-navy-900 transition-[width] duration-200 lg:flex",
          collapsed ? "w-18" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-navy-600",
            collapsed ? "justify-center px-2" : "px-5",
          )}
        >
          <Logo to="/admin" withWordmark={!collapsed} badge={collapsed ? undefined : "Admin"} />
        </div>
        <nav aria-label="Admin navigation" className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-4">
          <NavSections collapsed={collapsed} />
        </nav>
        <div className="border-t border-navy-600 p-3">
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            leftIcon={
              collapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              )
            }
          >
            {!collapsed && "Collapse"}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-navy-600 bg-navy-950/90 px-4 backdrop-blur sm:px-6">
          <IconButton
            label="Open navigation"
            icon={<Menu className="h-5 w-5" aria-hidden="true" />}
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
          />
          <div className="lg:hidden">
            <Logo size={24} to="/admin" badge="Admin" />
          </div>
          <button
            type="button"
            onClick={() => navigate(SEARCH_TARGET)}
            className="ml-auto hidden h-9 w-72 items-center gap-2 rounded-lg border border-navy-600 bg-navy-900/70 px-3 text-sm text-muted transition-colors duration-150 hover:border-navy-500 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 md:flex"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            <span className="flex-1 text-left">Search incidents</span>
            <kbd className="rounded border border-navy-600 bg-navy-800 px-1.5 py-0.5 font-mono text-[10px] text-faint">
              Ctrl K
            </kbd>
          </button>
          <IconButton
            label="Search incidents"
            icon={<Search className="h-5 w-5" aria-hidden="true" />}
            className="ml-auto md:hidden"
            onClick={() => navigate(SEARCH_TARGET)}
          />
          <UserMenu />
        </header>
        <main id="main" tabIndex={-1} className="flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
        <CompactFooter />
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Admin navigation"
        side="left"
        size="sm"
      >
        <nav aria-label="Admin navigation">
          <NavSections collapsed={false} onNavigate={() => setDrawerOpen(false)} />
        </nav>
      </Drawer>
    </div>
  );
}
