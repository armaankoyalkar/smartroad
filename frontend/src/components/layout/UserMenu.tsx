import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import {
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "@/auth/useAuth";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/useToast";
import { ROLE_LABELS } from "@/constants/enums";
import { cn } from "@/utils/cn";

interface MenuEntry {
  label: string;
  icon: LucideIcon;
  to?: string;
  onSelect?: () => void;
}

export interface UserMenuProps {
  /** Hide the name next to the avatar (small headers). */
  compact?: boolean;
  className?: string;
}

const ITEM_CLASSES =
  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-text transition-colors duration-150 hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none";

/** Avatar button with a dropdown menu: dashboards, profile and sign out. Renders nothing when signed out. */
export function UserMenu({ compact = false, className }: UserMenuProps) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when the route changes (state adjusted during render, the React-recommended pattern).
  const [seenPath, setSeenPath] = useState(location.pathname);
  if (seenPath !== location.pathname) {
    setSeenPath(location.pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    const first = menuRef.current?.querySelector<HTMLElement>("[role='menuitem']");
    first?.focus();
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!user) return null;

  const entries: MenuEntry[] = isAdmin
    ? [
        { label: "Admin dashboard", icon: ShieldCheck, to: "/admin" },
        { label: "Citizen dashboard", icon: LayoutDashboard, to: "/app" },
        { label: "Profile", icon: User, to: "/app/profile" },
      ]
    : [
        { label: "Dashboard", icon: LayoutDashboard, to: "/app" },
        { label: "My reports", icon: ClipboardList, to: "/app/reports" },
        { label: "Profile", icon: User, to: "/app/profile" },
      ];

  const signOut = () => {
    setOpen(false);
    logout();
    toast.info("You have signed out.");
    navigate("/", { replace: true });
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      items[(index + delta + items.length) % items.length]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      items[event.key === "Home" ? 0 : items.length - 1]?.focus();
    } else if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
      buttonRef.current?.focus();
      if (event.key === "Escape") event.preventDefault();
    }
  };

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        id={`${id}-button`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className="flex h-10 items-center gap-2 rounded-full border border-transparent pl-1 pr-2 text-sm transition-colors duration-150 hover:border-navy-600 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
      >
        <Avatar name={user.name} size="sm" />
        {!compact && <span className="hidden max-w-32 truncate text-text sm:block">{user.name}</span>}
        <ChevronDown className="h-4 w-4 text-muted" aria-hidden="true" />
        <span className="sr-only">Account menu</span>
      </button>

      {open && (
        <div
          ref={menuRef}
          id={`${id}-menu`}
          role="menu"
          aria-labelledby={`${id}-button`}
          onKeyDown={onMenuKeyDown}
          className="surface absolute right-0 z-50 mt-2 w-64 animate-slide-down p-1.5 shadow-pop"
        >
          <div className="border-b border-navy-600 px-2.5 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-medium text-text">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wider text-cyan-300">
              {ROLE_LABELS[user.role] ?? user.role}
            </p>
          </div>
          <div className="py-1">
            {entries.map((entry) => {
              const Icon = entry.icon;
              return entry.to ? (
                <Link key={entry.label} to={entry.to} role="menuitem" tabIndex={-1} className={ITEM_CLASSES}>
                  <Icon className="h-4 w-4 text-muted" aria-hidden="true" />
                  {entry.label}
                </Link>
              ) : null;
            })}
          </div>
          <div className="border-t border-navy-600 pt-1">
            <button type="button" role="menuitem" tabIndex={-1} onClick={signOut} className={ITEM_CLASSES}>
              <LogOut className="h-4 w-4 text-muted" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
