import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMe } from "@/api/auth";
import { ApiError, tokenStore } from "@/api/client";
import { createTestQueryClient, TEST_USER } from "@/test/utils";
import { AuthProvider } from "./AuthContext";
import { useAuth } from "./useAuth";

vi.mock("@/api/auth", () => ({ getMe: vi.fn() }));
const getMeMock = vi.mocked(getMe);

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="user">{auth.user?.name ?? ""}</span>
      <span data-testid="admin">{String(auth.isAdmin)}</span>
      <button type="button" onClick={() => auth.login("token-2", { ...TEST_USER, role: "admin" })}>
        login
      </button>
      <button type="button" onClick={auth.logout}>
        logout
      </button>
    </div>
  );
}

function renderProbe() {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    tokenStore.clear();
    getMeMock.mockReset();
  });

  it("starts anonymous without a stored token and never calls /auth/me", () => {
    renderProbe();
    expect(screen.getByTestId("status")).toHaveTextContent("anonymous");
    expect(getMeMock).not.toHaveBeenCalled();
  });

  it("restores the session from the stored token through /auth/me", async () => {
    tokenStore.set("stored-token");
    getMeMock.mockResolvedValue(TEST_USER);
    renderProbe();
    expect(screen.getByTestId("status")).toHaveTextContent("loading");
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("authenticated"));
    expect(screen.getByTestId("user")).toHaveTextContent("Priya Sharma");
    expect(tokenStore.get()).toBe("stored-token");
  });

  it("drops an invalid token when /auth/me answers 401", async () => {
    tokenStore.set("expired");
    getMeMock.mockRejectedValue(new ApiError("UNAUTHENTICATED", "Token expired.", { status: 401 }));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("anonymous"));
    expect(tokenStore.get()).toBeNull();
  });

  it("keeps the token but stays anonymous when the server is unreachable", async () => {
    tokenStore.set("maybe-valid");
    getMeMock.mockRejectedValue(new ApiError("NETWORK_ERROR", "Cannot reach the server.", { status: 0 }));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("anonymous"));
    expect(tokenStore.get()).toBe("maybe-valid");
  });

  it("login stores the token and user; logout clears both", async () => {
    const user = userEvent.setup();
    renderProbe();
    await user.click(screen.getByRole("button", { name: "login" }));
    expect(screen.getByTestId("status")).toHaveTextContent("authenticated");
    expect(screen.getByTestId("admin")).toHaveTextContent("true");
    expect(tokenStore.get()).toBe("token-2");

    await user.click(screen.getByRole("button", { name: "logout" }));
    expect(screen.getByTestId("status")).toHaveTextContent("anonymous");
    expect(screen.getByTestId("user")).toHaveTextContent("");
    expect(tokenStore.get()).toBeNull();
  });
});
