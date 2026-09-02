import type * as AuthApi from "@/api/auth";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { register } from "@/api/auth";
import { ApiError } from "@/api/client";
import { authValue, renderWithProviders, TEST_USER } from "@/test/utils";
import RegisterPage from "../RegisterPage";

vi.mock("@/api/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof AuthApi>()),
  register: vi.fn(),
}));

const registerMock = vi.mocked(register);

function ShowLocation() {
  const location = useLocation();
  return <p>at {location.pathname}</p>;
}

function App() {
  return (
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="*" element={<ShowLocation />} />
    </Routes>
  );
}

async function fill(
  user: ReturnType<typeof userEvent.setup>,
  values: { name?: string; email?: string; password?: string; confirm?: string },
) {
  if (values.name) await user.type(screen.getByLabelText(/^Full name/), values.name);
  if (values.email) await user.type(screen.getByLabelText(/^Email/), values.email);
  if (values.password) await user.type(screen.getByLabelText(/^Password/), values.password);
  if (values.confirm) await user.type(screen.getByLabelText(/^Confirm password/), values.confirm);
}

describe("RegisterPage", () => {
  beforeEach(() => {
    registerMock.mockReset();
  });

  it("rejects a mismatched password confirmation before calling the API", async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/register" });
    await fill(user, {
      name: "Priya Sharma",
      email: "priya@example.com",
      password: "password123",
      confirm: "password124",
    });
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("shows a length-based strength hint while typing", async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/register" });
    await user.type(screen.getByLabelText(/^Password/), "short");
    expect(screen.getByText(/Too short/)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/^Password/), "-but-now-long-enough");
    expect(screen.getByText(/Strong\./)).toBeInTheDocument();
  });

  it("shows EMAIL_TAKEN inline on the email field with a link to sign in", async () => {
    const user = userEvent.setup();
    registerMock.mockRejectedValue(
      new ApiError("EMAIL_TAKEN", "An account with this email already exists.", { status: 409 }),
    );
    renderWithProviders(<App />, { route: "/register" });
    await fill(user, {
      name: "Priya Sharma",
      email: "priya@example.com",
      password: "password123",
      confirm: "password123",
    });
    await user.click(screen.getByRole("button", { name: "Create account" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("An account with this email already exists.");
    expect(screen.getByRole("link", { name: "Sign in instead" })).toHaveAttribute("href", "/login");
    expect(screen.getByLabelText(/^Email/)).toHaveAttribute("aria-invalid", "true");
  });

  it("stores the session and goes to the citizen dashboard on success", async () => {
    const user = userEvent.setup();
    registerMock.mockResolvedValue({ token: "jwt-token", user: TEST_USER });
    const auth = authValue();
    renderWithProviders(<App />, { route: "/register", auth });
    await fill(user, {
      name: "Priya Sharma",
      email: "priya@example.com",
      password: "password123",
      confirm: "password123",
    });
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("at /app")).toBeInTheDocument();
    // TanStack passes a mutation context as the second argument; only the payload matters here.
    expect(registerMock.mock.calls[0]?.[0]).toEqual({
      name: "Priya Sharma",
      email: "priya@example.com",
      password: "password123",
      phone: undefined,
    });
    expect(auth.login).toHaveBeenCalledWith("jwt-token", TEST_USER);
  });
});
