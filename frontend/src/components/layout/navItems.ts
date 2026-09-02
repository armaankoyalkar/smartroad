import {
  Activity,
  ChartColumn,
  CirclePlus,
  ClipboardList,
  LayoutDashboard,
  Map as MapIcon,
  MapPinned,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  /** Shorter label for the mobile bottom bar. */
  shortLabel?: string;
  to: string;
  icon: LucideIcon;
  /** Match only the exact path (index routes). */
  end?: boolean;
}

export interface NavSection {
  title: string;
  items: readonly NavItem[];
}

/** Citizen area (side navigation on lg+, bottom bar on phones). */
export const CITIZEN_NAV: readonly NavItem[] = [
  { label: "Dashboard", to: "/app", icon: LayoutDashboard, end: true },
  { label: "Report an incident", shortLabel: "Report", to: "/app/report", icon: CirclePlus },
  { label: "My reports", shortLabel: "Reports", to: "/app/reports", icon: ClipboardList },
  { label: "Map", to: "/map", icon: MapIcon },
  { label: "Profile", to: "/app/profile", icon: User },
];

/** Admin area, grouped into sections. */
export const ADMIN_NAV: readonly NavSection[] = [
  { title: "Overview", items: [{ label: "Dashboard", to: "/admin", icon: LayoutDashboard, end: true }] },
  {
    title: "Operations",
    items: [
      { label: "Incidents", to: "/admin/incidents", icon: ClipboardList },
      { label: "Map & hotspots", to: "/admin/map", icon: MapPinned },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Analytics", to: "/admin/analytics", icon: ChartColumn },
      { label: "Risk estimation", to: "/admin/risk", icon: Activity },
    ],
  },
  { title: "Administration", items: [{ label: "Users", to: "/admin/users", icon: Users }] },
];
