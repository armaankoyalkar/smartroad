import { NavLink } from "react-router";
import { cn } from "@/utils/cn";
import type { NavItem } from "./navItems";

export interface SideNavLinkProps {
  item: NavItem;
  /** Icon-only rendering (label stays available to screen readers and as a title). */
  collapsed?: boolean;
  onNavigate?: () => void;
}

export function SideNavLink({ item, collapsed = false, onNavigate }: SideNavLinkProps) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400",
          collapsed && "justify-center px-0",
          isActive ? "bg-cyan-400/10 text-text" : "text-muted hover:bg-white/5 hover:text-text",
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              "h-4.5 w-4.5 shrink-0",
              isActive ? "text-cyan-300" : "text-muted group-hover:text-text",
            )}
            aria-hidden="true"
          />
          <span className={cn(collapsed && "sr-only")}>{item.label}</span>
        </>
      )}
    </NavLink>
  );
}
