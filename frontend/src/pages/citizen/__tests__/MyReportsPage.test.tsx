import type * as IncidentsApi from "@/api/incidents";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { listMyIncidents } from "@/api/incidents";
import { authenticatedAs, renderWithProviders, TEST_USER } from "@/test/utils";
import MyReportsPage from "../MyReportsPage";
import { makeIncident, pageMeta } from "./fixtures";

vi.mock("@/api/incidents", async (importOriginal) => ({
  ...(await importOriginal<typeof IncidentsApi>()),
  listMyIncidents: vi.fn(),
}));

const listMock = vi.mocked(listMyIncidents);

function renderPage(route = "/app/reports") {
  return renderWithProviders(<MyReportsPage />, {
    route,
    path: "/app/reports",
    auth: authenticatedAs(TEST_USER),
  });
}

describe("MyReportsPage", () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it("shows a busy table while the list loads", () => {
    listMock.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("heading", { name: "My reports" })).toBeInTheDocument();
  });

  it("shows an empty state with a call to action for new users", async () => {
    listMock.mockResolvedValue({ data: [], meta: pageMeta(0) });
    renderPage();
    // DataTable renders the empty state for both the table (md+) and the card list (phones).
    expect(await screen.findAllByText("You have not reported anything yet")).not.toHaveLength(0);
    expect(screen.getAllByRole("link", { name: "Report an incident" })[0]).toHaveAttribute(
      "href",
      "/app/report",
    );
  });

  it("offers to clear the filters when a filtered list is empty", async () => {
    listMock.mockResolvedValue({ data: [], meta: pageMeta(0) });
    renderPage("/app/reports?status=RESOLVED");
    expect(await screen.findAllByText("No reports match these filters")).not.toHaveLength(0);
    expect(listMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: ["RESOLVED"], sort: "-createdAt", page: 1 }),
    );
  });

  it("shows the error with a retry that refetches", async () => {
    const user = userEvent.setup();
    listMock
      .mockRejectedValueOnce(new ApiError("INTERNAL_ERROR", "Database unavailable", { status: 500 }))
      .mockResolvedValueOnce({ data: [makeIncident()], meta: pageMeta(1) });
    renderPage();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Database unavailable");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect((await screen.findAllByText("Deep pothole near Hitec City flyover")).length).toBeGreaterThan(0);
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  it("renders rows with badges, a demo-data label for seed records and links to the details", async () => {
    listMock.mockResolvedValue({
      data: [
        makeIncident(),
        makeIncident({
          id: "66d5a2b8c2b7a4e8f1a2b3d9",
          title: "Waterlogging under the railway bridge",
          category: "WATERLOGGING",
          status: "VERIFIED",
          verification: "VERIFIED",
          priority: "HIGH",
          source: "seed",
        }),
      ],
      meta: pageMeta(2),
    });
    renderPage();
    await screen.findAllByText("Waterlogging under the railway bridge");
    expect(screen.getAllByText("Demo data").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Verified").length).toBeGreaterThan(0);
    const links = screen.getAllByRole("link", { name: /Deep pothole near Hitec City flyover/ });
    expect(links[0]).toHaveAttribute("href", "/app/reports/66d5a2b8c2b7a4e8f1a2b3d0");
    expect(screen.getByText(/Showing/)).toHaveTextContent("Showing 1 to 2 of 2 reports");
  });

  it("changes the sort through the column headers and keeps it in the URL", async () => {
    const user = userEvent.setup();
    listMock.mockResolvedValue({ data: [makeIncident()], meta: pageMeta(1) });
    renderPage();
    await screen.findAllByText("Deep pothole near Hitec City flyover");
    await user.click(screen.getByRole("button", { name: /Severity/ }));
    await waitFor(() =>
      expect(listMock).toHaveBeenLastCalledWith(expect.objectContaining({ sort: "-severity" })),
    );
  });
});
