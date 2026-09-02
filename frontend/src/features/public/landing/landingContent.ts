/**
 * Static copy for the landing page. Every claim here describes what the system actually does
 * (docs/design/01-requirements.md, NFR-13): estimates, historical data, clusters of reports.
 */
import {
  Activity,
  ChartColumn,
  CircleCheck,
  Database,
  FilePlus,
  Map as MapIcon,
  Radar,
  ShieldCheck,
  Camera,
  type LucideIcon,
} from "lucide-react";

export interface Step {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const STEPS: readonly Step[] = [
  {
    title: "Report",
    description:
      "A citizen describes the incident, picks the spot on the map or uses their location, and can attach one photo. The report starts as Submitted.",
    icon: FilePlus,
  },
  {
    title: "Verify",
    description:
      "An administrator reviews the report, verifies or rejects it with a reason, and sets a priority. Every change is recorded in the report's history.",
    icon: ShieldCheck,
  },
  {
    title: "Resolve",
    description:
      "Work is tracked from Verified to In progress to Resolved. The reporter sees each step and every note in the app; nothing happens silently.",
    icon: CircleCheck,
  },
];

export interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  /** Small honesty tag shown under the description. */
  note?: string;
}

export const FEATURES: readonly Feature[] = [
  {
    title: "Incident reporting",
    description:
      "Title, category, description, severity, a map-picked or typed location and an optional photo. Addresses are suggested from the map position and stay editable.",
    icon: Camera,
  },
  {
    title: "Verification workflow",
    description:
      "Submitted, Under review, Verified, In progress, Resolved or Rejected. Transitions are enforced by the server; rejections need a reason that the reporter can read.",
    icon: ShieldCheck,
  },
  {
    title: "GIS incident map",
    description:
      "Leaflet on OpenStreetMap tiles with filters by category, status, severity and date, marker clustering and a legend driven by the same colours as the markers.",
    icon: MapIcon,
  },
  {
    title: "Analytics",
    description:
      "Counts by category, status, priority and severity, plus incidents over time, aggregated from the database. Demo records are labelled and can be excluded.",
    icon: ChartColumn,
  },
  {
    title: "Hotspot analysis (DBSCAN)",
    description:
      "Density clusters of reported incidents computed with DBSCAN on haversine distance. They show where reports concentrate; they are not an output of the risk model.",
    icon: Radar,
    note: "Administrator view",
  },
  {
    title: "Risk estimation (Random Forest)",
    description:
      "A classifier trained on a documented historical dataset estimates a LOW, MEDIUM or HIGH risk level for a set of conditions, with class probabilities and evaluation metrics shown alongside.",
    icon: Activity,
    note: "Estimate from historical data, labelled as a demo model where applicable",
  },
];

export interface RoleCard {
  title: string;
  description: string;
  points: readonly string[];
}

export const ROLE_CARDS: readonly RoleCard[] = [
  {
    title: "Citizen",
    description: "Anyone with an account.",
    points: [
      "Report incidents with a location and a photo",
      "Follow each report's status and history, including administrator notes",
      "Edit a report until an administrator starts reviewing it",
      "Browse the public map and summary figures",
    ],
  },
  {
    title: "Administrator",
    description: "Road-authority staff in the scenario; the project team during demos.",
    points: [
      "Search, filter and open every report, including the reporter's contact details",
      "Verify or reject reports with a reason, set priorities and track work to resolution",
      "Study analytics, hotspot clusters and the risk-model research view",
      "Manage user accounts",
    ],
  },
];

export interface Technology {
  name: string;
  role: string;
  icon: LucideIcon;
}

export const TECHNOLOGIES: readonly Technology[] = [
  {
    name: "React 19 + Vite + TypeScript",
    role: "Single-page application, Tailwind CSS design system",
    icon: MapIcon,
  },
  {
    name: "Node.js + Express 5",
    role: "REST API with JWT authentication, zod validation and safe uploads",
    icon: ShieldCheck,
  },
  {
    name: "MongoDB + Mongoose",
    role: "Users and incidents with a 2dsphere index for map queries",
    icon: Database,
  },
  {
    name: "Leaflet + OpenStreetMap",
    role: "Base map tiles, markers, clustering and reverse geocoding",
    icon: Radar,
  },
  {
    name: "Python + scikit-learn",
    role: "Random Forest risk classifier and DBSCAN hotspots behind a FastAPI service",
    icon: Activity,
  },
  {
    name: "TanStack Query + Recharts",
    role: "Server-state caching and the analytics charts",
    icon: ChartColumn,
  },
];

export const PROJECT_PEOPLE = {
  lead: "Balaji Lakshmipathi",
  members: ["Vivek Reddy", "Arman Koyalkar"],
  guide: "Rajesh Adluri",
  acceptance: "Aruja Jyothi Ma'am",
} as const;
