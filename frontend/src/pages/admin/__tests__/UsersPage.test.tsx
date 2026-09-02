import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { authenticatedAs, renderWithProviders, TEST_ADMIN } from "@/test/utils";
import UsersPage from "../UsersPage";
import { ADMIN_USER_DETAIL, ADMIN_USER_ROW, pageMeta } from "./fixtures";

vi.mock("@/api/users", () => ({
  listUsers: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  updateMe: vi.fn(),
  changePassword: vi.fn(),
}));

import * as users from "@/api/users";

const ME_ROW = {
  ...ADMIN_USER_ROW,
  id: TEST_ADMIN.id,
  name: TEST_ADMIN.name,
  email: TEST_ADMIN.email,
  role: "admin" as const,
};

function renderPage() {
  return renderWithProviders(<UsersPage />, { route: "/admin/users", auth: authenticatedAs(TEST_ADMIN) });
}

describe("UsersPage", () => {
  beforeEach(() => {
    vi.mocked(users.listUsers).mockResolvedValue({ data: [ADMIN_USER_ROW, ME_ROW], meta: pageMeta(2) });
    vi.mocked(users.getUser).mockResolvedValue(ADMIN_USER_DETAIL);
  });

  it("lists users with role, account state, incident count and join date", async () => {
    renderPage();
    await screen.findAllByText("priya@example.com");
    const table = screen.getByRole("table", { name: "Users" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("priya@example.com")).toBeInTheDocument();
    expect(within(rows[0]).getByRole("combobox", { name: "Role of Priya Sharma" })).toHaveValue("citizen");
    expect(within(rows[1]).getByRole("combobox", { name: `Role of ${TEST_ADMIN.name}` })).toHaveValue(
      "admin",
    );
    expect(within(rows[0]).getByRole("switch", { name: "Active" })).toBeChecked();
    expect(within(rows[0]).getByText("4")).toBeInTheDocument();
    expect(within(rows[0]).getByText("1 Aug 2026")).toBeInTheDocument();
    expect(within(rows[1]).getByText("(you)")).toBeInTheDocument();
  });

  it("confirms before deactivating and sends the change", async () => {
    const user = userEvent.setup();
    vi.mocked(users.updateUser).mockResolvedValue({ ...ADMIN_USER_ROW, isActive: false });
    renderPage();
    await screen.findAllByText("priya@example.com");
    const table = screen.getByRole("table", { name: "Users" });
    const row = within(table).getAllByRole("row")[1];
    await user.click(within(row).getByRole("switch", { name: "Active" }));

    const dialog = await screen.findByRole("dialog", { name: "Deactivate Priya Sharma?" });
    expect(users.updateUser).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    await waitFor(() =>
      expect(users.updateUser).toHaveBeenCalledWith(ADMIN_USER_ROW.id, { isActive: false }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Priya Sharma deactivated")).toBeInTheDocument();
  });

  it("surfaces the API self-protection message inside the dialog", async () => {
    const user = userEvent.setup();
    vi.mocked(users.updateUser).mockRejectedValue(
      new ApiError("VALIDATION_ERROR", "Request validation failed.", {
        status: 400,
        details: [{ field: "id", message: "You cannot deactivate your own account." }],
      }),
    );
    renderPage();
    await screen.findAllByText("priya@example.com");
    const table = screen.getByRole("table", { name: "Users" });
    const row = within(table).getAllByRole("row")[2];
    await user.click(within(row).getByRole("switch", { name: "Active" }));
    const dialog = await screen.findByRole("dialog", { name: `Deactivate ${TEST_ADMIN.name}?` });
    await user.click(within(dialog).getByRole("button", { name: "Deactivate" }));
    expect(await within(dialog).findByText("You cannot deactivate your own account.")).toBeInTheDocument();
  });

  it("confirms a role change and opens the user drawer with counts by status", async () => {
    const user = userEvent.setup();
    vi.mocked(users.updateUser).mockResolvedValue({ ...ADMIN_USER_ROW, role: "admin" });
    renderPage();
    await screen.findAllByText("priya@example.com");
    const table = screen.getByRole("table", { name: "Users" });
    const row = within(table).getAllByRole("row")[1];
    await user.selectOptions(within(row).getByRole("combobox", { name: "Role of Priya Sharma" }), "admin");
    const dialog = await screen.findByRole("dialog", { name: "Change Priya Sharma's role?" });
    await user.click(within(dialog).getByRole("button", { name: "Change role" }));
    await waitFor(() => expect(users.updateUser).toHaveBeenCalledWith(ADMIN_USER_ROW.id, { role: "admin" }));

    await user.click(within(row).getByRole("button", { name: /Priya Sharma/ }));
    const drawer = await screen.findByRole("dialog", { name: "Priya Sharma" });
    expect(await within(drawer).findByText("Incidents by status")).toBeInTheDocument();
    expect(within(drawer).getByText("Verified").nextElementSibling).toHaveTextContent("2");
  });
});
