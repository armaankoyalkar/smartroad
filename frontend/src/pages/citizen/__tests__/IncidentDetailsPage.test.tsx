import type * as IncidentsApi from "@/api/incidents";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { getIncident } from "@/api/incidents";
import { authenticatedAs, renderWithProviders, TEST_ADMIN, TEST_USER } from "@/test/utils";
import type { Incident } from "@/types/api";
import IncidentDetailsPage from "../IncidentDetailsPage";
import { makeIncident } from "./fixtures";

vi.mock("@/api/incidents", async (importOriginal) => ({
  ...(await importOriginal<typeof IncidentsApi>()),
  getIncident: vi.fn(),
}));

vi.mock("@/components/map/LazyMap", () => ({
  LazyMiniMap: (props: { latitude: number; longitude: number }) => (
    <div data-testid="mini-map">
      {props.latitude},{props.longitude}
    </div>
  ),
  LazyLocationPicker: () => null,
}));

const getMock = vi.mocked(getIncident);

const reviewed: Incident = makeIncident({
  status: "UNDER_REVIEW",
  statusHistory: [
    {
      field: "status",
      from: null,
      to: "SUBMITTED",
      note: null,
      changedBy: null,
      at: "2026-09-01T10:02:11.000Z",
    },
    {
      field: "status",
      from: "SUBMITTED",
      to: "UNDER_REVIEW",
      note: "Checking the photo against the location.",
      changedBy: null,
      at: "2026-09-02T08:00:00.000Z",
    },
  ],
});

function renderPage(user = TEST_USER, id = "66d5a2b8c2b7a4e8f1a2b3d0") {
  return renderWithProviders(<IncidentDetailsPage />, {
    route: `/app/reports/${id}`,
    path: "/app/reports/:id",
    auth: authenticatedAs(user),
  });
}

describe("IncidentDetailsPage", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("shows a loading state first", () => {
    getMock.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("status", { name: "Loading report" })).toBeInTheDocument();
  });

  it("renders the header, facts, location and the status timeline with notes", async () => {
    getMock.mockResolvedValue(reviewed);
    renderPage();
    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Deep pothole near Hitec City flyover",
    );
    expect(screen.getByText("Report submitted (Submitted)")).toBeInTheDocument();
    expect(screen.getByText("Status changed to Under review")).toBeInTheDocument();
    expect(screen.getByText(/Checking the photo against the location\./)).toBeInTheDocument();
    expect(screen.getByTestId("mini-map")).toHaveTextContent("17.4483,78.3814");
    expect(screen.getAllByText("Hitec City Main Road, Madhapur, Hyderabad").length).toBeGreaterThan(0);
    expect(screen.getByText("No photo attached")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
  });

  it("offers Edit only while the report is SUBMITTED and the viewer is the reporter", async () => {
    getMock.mockResolvedValue(makeIncident());
    renderPage();
    expect(await screen.findByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/app/reports/66d5a2b8c2b7a4e8f1a2b3d0/edit",
    );
  });

  it("hides Edit once the report has moved on, with an explanation for the reporter", async () => {
    getMock.mockResolvedValue(reviewed);
    renderPage();
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.getByText(/can no longer be edited/)).toBeInTheDocument();
  });

  it("hides Edit for a signed-in user who is not the reporter", async () => {
    getMock.mockResolvedValue(makeIncident({ reportedBy: null }));
    renderPage();
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByText(/can no longer be edited/)).not.toBeInTheDocument();
  });

  it("shows the admin note, the demo-data label and an admin link for administrators", async () => {
    getMock.mockResolvedValue(
      makeIncident({
        source: "seed",
        adminNote: "Confirmed by site photo.",
        reportedBy: { id: TEST_USER.id, name: TEST_USER.name, email: TEST_USER.email },
      }),
    );
    renderPage(TEST_ADMIN);
    await screen.findByRole("heading", { level: 1 });
    expect(screen.getAllByText("Demo data").length).toBeGreaterThan(0);
    expect(screen.getByText("Confirmed by site photo.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open in admin view" })).toHaveAttribute(
      "href",
      "/admin/incidents/66d5a2b8c2b7a4e8f1a2b3d0",
    );
    expect(screen.getByText(TEST_USER.email)).toBeInTheDocument();
  });

  it("shows a not-found state for unknown ids", async () => {
    getMock.mockRejectedValue(new ApiError("NOT_FOUND", "Incident not found.", { status: 404 }));
    renderPage();
    expect(await screen.findByText("Report not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to my reports" })).toHaveAttribute("href", "/app/reports");
  });
});
