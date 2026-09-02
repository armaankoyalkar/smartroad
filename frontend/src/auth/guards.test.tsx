import { screen } from "@testing-library/react";
import { Route, Routes, useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { authenticatedAs, authValue, renderWithProviders, TEST_ADMIN, TEST_USER } from "@/test/utils";
import { loginRedirect, safeReturnTo } from "./redirects";
import { RequireAuth } from "./RequireAuth";
import { RequireRole } from "./RequireRole";

function ShowLocation({ label }: { label: string }) {
  const location = useLocation();
  return (
    <p>
      {label} {location.pathname}
      {location.search}
    </p>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<ShowLocation label="Login page" />} />
      <Route element={<RequireAuth />}>
        <Route path="/app" element={<ShowLocation label="Citizen area" />} />
        <Route element={<RequireRole role="admin" />}>
          <Route path="/admin" element={<ShowLocation label="Admin area" />} />
        </Route>
      </Route>
    </Routes>
  );
}

describe("RequireAuth", () => {
  it("sends anonymous visitors to /login with a returnTo", () => {
    renderWithProviders(<App />, { route: "/app?tab=1", auth: authValue() });
    expect(screen.getByText(/Login page/)).toHaveTextContent("Login page /login?returnTo=%2Fapp%3Ftab%3D1");
  });

  it("renders the protected route for signed-in users", () => {
    renderWithProviders(<App />, { route: "/app", auth: authenticatedAs(TEST_USER) });
    expect(screen.getByText(/Citizen area/)).toBeInTheDocument();
  });

  it("shows a loader while the session is being restored", () => {
    renderWithProviders(<App />, { route: "/app", auth: authValue({ status: "loading", token: "t" }) });
    expect(screen.getByRole("status")).toHaveTextContent("Restoring your session");
  });
});

describe("RequireRole", () => {
  it("lets administrators in", () => {
    renderWithProviders(<App />, { route: "/admin", auth: authenticatedAs(TEST_ADMIN) });
    expect(screen.getByText(/Admin area/)).toBeInTheDocument();
  });

  it("redirects citizens to their dashboard with an explanation", async () => {
    renderWithProviders(<App />, { route: "/admin", auth: authenticatedAs(TEST_USER) });
    expect(screen.getByText(/Citizen area/)).toHaveTextContent("Citizen area /app");
    expect(await screen.findByText("That area is for administrators only.")).toBeInTheDocument();
  });

  it("sends anonymous visitors to /login", () => {
    renderWithProviders(<App />, { route: "/admin", auth: authValue() });
    expect(screen.getByText(/Login page/)).toHaveTextContent("returnTo=%2Fadmin");
  });
});

describe("redirect helpers", () => {
  it("builds and sanitises returnTo values", () => {
    expect(loginRedirect("/app/reports", "?page=2")).toBe("/login?returnTo=%2Fapp%2Freports%3Fpage%3D2");
    expect(safeReturnTo("/app/reports")).toBe("/app/reports");
    expect(safeReturnTo("https://evil.example")).toBe("/app");
    expect(safeReturnTo("//evil.example")).toBe("/app");
    expect(safeReturnTo(null, "/admin")).toBe("/admin");
  });
});
