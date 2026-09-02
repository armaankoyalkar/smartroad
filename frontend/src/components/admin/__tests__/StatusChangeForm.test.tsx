import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { authenticatedAs, renderWithProviders, TEST_ADMIN } from "@/test/utils";
import { incident } from "@/pages/admin/__tests__/fixtures";
import { StatusChangeForm } from "../StatusChangeForm";

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

const SUBMITTED = incident();

function renderForm() {
  return renderWithProviders(<StatusChangeForm incident={SUBMITTED} />, {
    auth: authenticatedAs(TEST_ADMIN),
  });
}

describe("StatusChangeForm", () => {
  beforeEach(() => {
    vi.mocked(incidents.changeIncidentStatus).mockReset();
  });

  it("offers only the transitions allowed from the current status", () => {
    renderForm();
    const options = within(screen.getByRole("combobox", { name: /New status/ }))
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(options).toEqual(["Choose a status", "Under review", "Rejected"]);
  });

  it("requires a note when rejecting and confirms before sending it", async () => {
    const user = userEvent.setup();
    vi.mocked(incidents.changeIncidentStatus).mockResolvedValue({ ...SUBMITTED, status: "REJECTED" });
    renderForm();

    await user.selectOptions(screen.getByRole("combobox", { name: /New status/ }), "REJECTED");
    await user.click(screen.getByRole("button", { name: "Apply status" }));
    expect(screen.getByRole("alert")).toHaveTextContent("A reason is required when rejecting");
    expect(incidents.changeIncidentStatus).not.toHaveBeenCalled();

    await user.type(screen.getByRole("textbox", { name: /Note/ }), "Not a road issue");
    await user.click(screen.getByRole("button", { name: "Apply status" }));
    const dialog = await screen.findByRole("dialog", { name: "Reject this incident?" });
    await user.click(within(dialog).getByRole("button", { name: "Reject" }));

    await waitFor(() =>
      expect(incidents.changeIncidentStatus).toHaveBeenCalledWith(SUBMITTED.id, {
        status: "REJECTED",
        note: "Not a road issue",
      }),
    );
    expect(await screen.findByText("Status changed to Rejected")).toBeInTheDocument();
  });

  it("shows the server message on INVALID_TRANSITION", async () => {
    const user = userEvent.setup();
    vi.mocked(incidents.changeIncidentStatus).mockRejectedValue(
      new ApiError("INVALID_TRANSITION", "Cannot move an incident from RESOLVED to UNDER_REVIEW.", {
        status: 409,
        details: [{ from: "RESOLVED", to: "UNDER_REVIEW", allowed: ["IN_PROGRESS"] }],
      }),
    );
    renderForm();
    await user.selectOptions(screen.getByRole("combobox", { name: /New status/ }), "UNDER_REVIEW");
    await user.click(screen.getByRole("button", { name: "Apply status" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Cannot move an incident from RESOLVED to UNDER_REVIEW.");
    expect(alert).toHaveTextContent("Allowed now: In progress.");
  });
});
