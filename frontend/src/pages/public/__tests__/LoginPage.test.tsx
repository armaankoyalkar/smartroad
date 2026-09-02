import type * as AuthApi from "@/api/auth";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { login } from "@/api/auth";
import { ApiError } from "@/api/client";
import { authValue, renderWithProviders, TEST_ADMIN, TEST_USER } from "@/test/utils";
import LoginPage from "../LoginPage";

vi.mock("@/api/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof AuthApi>()),
  login: vi.fn(),
}));

const loginMock = vi.mocked(login);

function ShowLocation() {
  const location = useLocation();
  return (
    <p>
      at {location.pathname}
      {location.search}
    </p>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<ShowLocation />} />
    </Routes>
  );
}

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, email: string, password: string) {
  await user.type(screen.getByLabelText(/^Email/), email);
  await user.type(screen.getByLabelText(/^Password/), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("LoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
  });

  it("shows validation messages and does not call the API for an empty form", async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: "/login" });
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("shows the INVALID_CREDENTIALS message under the form without field hints", async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(
      new ApiError("INVALID_CREDENTIALS", "Incorrect email or password.", { status: 401 }),
    );
    const auth = authValue();
    renderWithProviders(<App />, { route: "/login", auth });
    await fillAndSubmit(user, "priya@example.com", "wrong-password");
    expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
    expect(auth.login).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Email/)).not.toHaveAttribute("aria-invalid");
  });

  it("explains a rate limit with a retry hint", async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValue(new ApiError("RATE_LIMITED", "Too many requests", { status: 429 }));
    renderWithProviders(<App />, { route: "/login" });
    await fillAndSubmit(user, "priya@example.com", "some-password");
    expect(await screen.findByRole("alert")).toHaveTextContent(/wait about fifteen minutes/i);
  });

  it("stores the session through AuthContext and honours returnTo for citizens", async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue({ token: "jwt-token", user: TEST_USER });
    const auth = authValue();
    renderWithProviders(<App />, { route: "/login?returnTo=%2Fapp%2Freports%3Fpage%3D2", auth });
    await fillAndSubmit(user, "priya@example.com", "correct-password");
    expect(await screen.findByText(/^at /)).toHaveTextContent("at /app/reports?page=2");
    // TanStack passes a mutation context as the second argument; only the payload matters here.
    expect(loginMock.mock.calls[0]?.[0]).toEqual({
      email: "priya@example.com",
      password: "correct-password",
    });
    expect(auth.login).toHaveBeenCalledWith("jwt-token", TEST_USER);
  });

  it("sends administrators to /admin and ignores unsafe returnTo values", async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValue({ token: "jwt-token", user: TEST_ADMIN });
    renderWithProviders(<App />, { route: "/login?returnTo=https%3A%2F%2Fevil.example" });
    await fillAndSubmit(user, "admin@example.com", "correct-password");
    expect(await screen.findByText(/^at /)).toHaveTextContent("at /admin");
  });
});
