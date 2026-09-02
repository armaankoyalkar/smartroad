import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { authenticatedAs, renderWithProviders, TEST_ADMIN } from "@/test/utils";
import AdminDashboardPage from "../AdminDashboardPage";
import {
  CATEGORY_BREAKDOWN,
  incident,
  pageMeta,
  PRIORITY_BREAKDOWN,
  RISK_DISTRIBUTION,
  STATUS_BREAKDOWN,
  SUMMARY,
  SUMMARY_META,
  TIMELINE,
  TIMELINE_META,
} from "./fixtures";

vi.mock("@/api/analytics", () => ({
  getSummary: vi.fn(),
  getBreakdown: vi.fn(),
  getTimeline: vi.fn(),
  getPublicStats: vi.fn(),
  getMyStats: vi.fn(),
}));
vi.mock("@/api/ml", () => ({
  getRiskDistribution: vi.fn(),
  getModelInfo: vi.fn(),
  estimateRisk: vi.fn(),
  getIncidentRisk: vi.fn(),
  refreshRisk: vi.fn(),
}));
vi.mock("@/api/incidents", () => ({
  listIncidents: vi.fn(),
  listMyIncidents: vi.fn(),
  getIncident: vi.fn(),
  createIncident: vi.fn(),
  updateIncident: vi.fn(),
  deleteIncident: vi.fn(),
  changeIncidentStatus: vi.fn(),
  setIncidentPriority: vi.fn(),
  buildIncidentFormData: vi.fn(),
}));
// Leaflet cannot render in jsdom; the map card is exercised through its own components.
vi.mock("@/components/admin/DashboardMap", () => ({
  default: () => <div data-testid="dashboard-map">map</div>,
}));

import * as analytics from "@/api/analytics";
import * as incidents from "@/api/incidents";
import * as ml from "@/api/ml";

function mockHappyPath() {
  vi.mocked(analytics.getSummary).mockResolvedValue({ data: SUMMARY, meta: SUMMARY_META });
  vi.mocked(analytics.getBreakdown).mockImplementation(async (by) =>
    by === "category" ? CATEGORY_BREAKDOWN : by === "status" ? STATUS_BREAKDOWN : PRIORITY_BREAKDOWN,
  );
  vi.mocked(analytics.getTimeline).mockResolvedValue({ data: TIMELINE, meta: TIMELINE_META });
  vi.mocked(ml.getRiskDistribution).mockResolvedValue(RISK_DISTRIBUTION);
  vi.mocked(incidents.listIncidents).mockResolvedValue({
    data: [incident({ title: "Fresh submission" })],
    meta: pageMeta(1),
  });
}

function renderPage() {
  return renderWithProviders(<AdminDashboardPage />, { route: "/admin", auth: authenticatedAs(TEST_ADMIN) });
}

describe("AdminDashboardPage", () => {
  beforeEach(() => {
    mockHappyPath();
  });

  it("renders every summary figure from the API and the demo-data note", async () => {
    renderPage();
    expect(await screen.findByText(/Demo data included: 80 records/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Total incidents/ })).toHaveTextContent("143");
    const cards: [RegExp, string][] = [
      [/Pending verification/, "22"],
      [/^Verified/, "30"],
      [/^Active/, "48"],
      [/Resolved/, "61"],
      [/Rejected/, "12"],
      [/High-priority open/, "9"],
    ];
    for (const [label, value] of cards) {
      expect(screen.getByRole("link", { name: label })).toHaveTextContent(value);
    }
    expect(screen.getByRole("link", { name: /^Active/ })).toHaveTextContent("includes verified");
    expect(screen.getByRole("link", { name: /Total incidents/ })).toHaveAttribute("href", "/admin/incidents");
  });

  it("fills the side cards from their own endpoints", async () => {
    renderPage();
    expect(await screen.findByText("Fresh submission")).toBeInTheDocument();
    const risk = screen.getByText("Risk overview").closest("div.surface") as HTMLElement;
    expect(await within(risk).findByText("132 of 144")).toBeInTheDocument();
    expect(within(risk).getByText("demo-rf-1.0.0")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-map")).toBeInTheDocument();
    expect(screen.getByText("Incidents by category")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Timeline range" })).toBeInTheDocument();
  });

  it("shows a per-card error state when one endpoint fails and keeps the others", async () => {
    vi.mocked(analytics.getSummary).mockRejectedValue(
      new ApiError("INTERNAL_ERROR", "Summary is temporarily unavailable.", { status: 500 }),
    );
    vi.mocked(ml.getRiskDistribution).mockRejectedValue(
      new ApiError("ML_UNAVAILABLE", "The ML service is not reachable.", { status: 503 }),
    );
    renderPage();
    expect(await screen.findByText("Summary is temporarily unavailable.")).toBeInTheDocument();
    expect(await screen.findByText("ML service unavailable")).toBeInTheDocument();
    expect(await screen.findByText("Fresh submission")).toBeInTheDocument();
    expect(screen.queryByText("143")).not.toBeInTheDocument();
    await waitFor(() => expect(analytics.getBreakdown).toHaveBeenCalledWith("category", expect.anything()));
  });
});
