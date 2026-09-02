import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authenticatedAs, renderWithProviders, TEST_ADMIN } from "@/test/utils";
import IncidentManagementPage from "../IncidentManagementPage";
import { incident, pageMeta, RESOLVED_SEED_INCIDENT } from "./fixtures";

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

import * as incidents from "@/api/incidents";

function ShowSearch() {
  const location = useLocation();
  return <p data-testid="search">{location.search}</p>;
}

const SUBMITTED = incident({ title: "Deep pothole near Hitec City flyover" });

function renderPage(route = "/admin/incidents") {
  return renderWithProviders(
    <>
      <IncidentManagementPage />
      <ShowSearch />
    </>,
    { route, auth: authenticatedAs(TEST_ADMIN) },
  );
}

describe("IncidentManagementPage", () => {
  beforeEach(() => {
    vi.mocked(incidents.listIncidents).mockResolvedValue({
      data: [SUBMITTED, RESOLVED_SEED_INCIDENT],
      meta: pageMeta(2),
    });
  });

  it("renders rows with badges, the reporter, the risk level and the demo-data marker", async () => {
    renderPage();
    await screen.findAllByRole("link", { name: SUBMITTED.title });
    const table = screen.getByRole("table", { name: "Incidents" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByRole("link", { name: SUBMITTED.title })).toHaveAttribute(
      "href",
      `/admin/incidents/${SUBMITTED.id}`,
    );
    expect(within(rows[0]).getByText("Priya Sharma")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Unassigned")).toBeInTheDocument();
    expect(within(rows[0]).getByText("not estimated")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Demo data")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Medium risk")).toBeInTheDocument();
    expect(screen.getByText("2 incidents match the current filters.")).toBeInTheDocument();
  });

  it("writes facet filters and the search text to the URL and the request", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByRole("link", { name: SUBMITTED.title });

    await user.click(screen.getByRole("button", { name: /^Filters/ }));
    await user.click(screen.getByRole("button", { name: "Submitted" }));
    expect(screen.getByTestId("search")).toHaveTextContent("?status=SUBMITTED");
    await waitFor(() =>
      expect(incidents.listIncidents).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: ["SUBMITTED"] }),
      ),
    );

    await user.type(screen.getByRole("searchbox", { name: "Search incidents" }), "flyover");
    await waitFor(() => expect(screen.getByTestId("search")).toHaveTextContent("q=flyover"));
    await waitFor(() =>
      expect(incidents.listIncidents).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "flyover", status: ["SUBMITTED"] }),
      ),
    );
  });

  it("reads filters from the URL on load", async () => {
    renderPage("/admin/incidents?status=RESOLVED,REJECTED&priority=UNASSIGNED&sort=severity&page=2");
    await waitFor(() =>
      expect(incidents.listIncidents).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ["RESOLVED", "REJECTED"],
          priority: ["UNASSIGNED"],
          sort: "severity",
          page: 2,
        }),
      ),
    );
  });

  it("offers only the allowed transitions in the quick status menu", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByRole("link", { name: SUBMITTED.title });
    const table = screen.getByRole("table", { name: "Incidents" });

    await user.click(within(table).getByRole("button", { name: `Change status of ${SUBMITTED.title}` }));
    let menu = screen.getByRole("menu", { name: `Change status of ${SUBMITTED.title}` });
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((el) => el.textContent),
    ).toEqual(["Under review", "Rejected"]);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(
      within(table).getByRole("button", { name: `Change status of ${RESOLVED_SEED_INCIDENT.title}` }),
    );
    menu = screen.getByRole("menu", { name: `Change status of ${RESOLVED_SEED_INCIDENT.title}` });
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((el) => el.textContent),
    ).toEqual(["In progress"]);
  });

  it("asks for a note before rejecting from the quick menu", async () => {
    const user = userEvent.setup();
    vi.mocked(incidents.changeIncidentStatus).mockResolvedValue({ ...SUBMITTED, status: "REJECTED" });
    renderPage();
    await screen.findAllByRole("link", { name: SUBMITTED.title });
    const table = screen.getByRole("table", { name: "Incidents" });
    await user.click(within(table).getByRole("button", { name: `Change status of ${SUBMITTED.title}` }));
    await user.click(screen.getByRole("menuitem", { name: "Rejected" }));

    const dialog = await screen.findByRole("dialog", { name: "Reject this incident?" });
    await user.click(within(dialog).getByRole("button", { name: "Reject" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("A reason is required when rejecting");
    expect(incidents.changeIncidentStatus).not.toHaveBeenCalled();

    await user.type(
      within(dialog).getByRole("textbox", { name: /Reason for rejection/ }),
      "Duplicate report",
    );
    await user.click(within(dialog).getByRole("button", { name: "Reject" }));
    await waitFor(() =>
      expect(incidents.changeIncidentStatus).toHaveBeenCalledWith(SUBMITTED.id, {
        status: "REJECTED",
        note: "Duplicate report",
      }),
    );
  });
});
