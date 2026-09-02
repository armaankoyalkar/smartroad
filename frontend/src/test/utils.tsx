/**
 * Test helpers: render with the provider stack (QueryClient, Auth, Meta, Toast, MemoryRouter)
 * using fixed data instead of the network.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { vi } from "vitest";
import { AuthContext, type AuthContextValue } from "@/auth/context";
import { ToastProvider } from "@/components/ui/Toast";
import { MetaContext } from "@/meta/context";
import { FALLBACK_ENUMS } from "@/meta/fallbacks";
import { createMetaValue } from "@/meta/metaValue";
import type { Category, User } from "@/types/api";

/** The ten categories of docs/api.md section 2 with their documented colours. */
export const TEST_CATEGORIES: Category[] = [
  { key: "POTHOLE", label: "Pothole", color: "#D97706", description: "" },
  { key: "ROAD_DAMAGE", label: "Road damage", color: "#7C3AED", description: "" },
  { key: "ACCIDENT", label: "Accident", color: "#DC2626", description: "" },
  { key: "TRAFFIC_CONGESTION", label: "Traffic congestion", color: "#EA580C", description: "" },
  { key: "TRAFFIC_SIGNAL", label: "Broken traffic signal", color: "#2563EB", description: "" },
  { key: "STREET_LIGHT", label: "Street-light issue", color: "#CA8A04", description: "" },
  { key: "UNSAFE_ROAD", label: "Unsafe road condition", color: "#DB2777", description: "" },
  { key: "OBSTRUCTION", label: "Obstruction", color: "#0891B2", description: "" },
  { key: "WATERLOGGING", label: "Waterlogging", color: "#0D9488", description: "" },
  { key: "OTHER", label: "Other", color: "#6B7280", description: "" },
];

export const TEST_META = createMetaValue({
  categories: TEST_CATEGORIES,
  enums: FALLBACK_ENUMS,
  categoriesFromApi: true,
  enumsFromApi: true,
});

export const TEST_USER: User = {
  id: "66d5a2b8c2b7a4e8f1a2b3d1",
  name: "Priya Sharma",
  email: "priya@example.com",
  role: "citizen",
  phone: null,
  createdAt: "2026-08-01T10:00:00.000Z",
};

export const TEST_ADMIN: User = {
  ...TEST_USER,
  id: "66d5a2b8c2b7a4e8f1a2b3d2",
  name: "Admin One",
  email: "admin@example.com",
  role: "admin",
};

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 }, mutations: { retry: false } },
  });
}

export function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    status: "anonymous",
    user: null,
    token: null,
    isAuthenticated: false,
    isAdmin: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    refresh: vi.fn(async () => null),
    ...overrides,
  };
}

export function authenticatedAs(user: User): AuthContextValue {
  return authValue({
    status: "authenticated",
    user,
    token: "test-token",
    isAuthenticated: true,
    isAdmin: user.role === "admin",
  });
}

export interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  /** Initial URL of the MemoryRouter. */
  route?: string;
  /** When set, the element is mounted at this route pattern (so useParams works). */
  path?: string;
  auth?: AuthContextValue;
  queryClient?: QueryClient;
}

export function renderWithProviders(ui: ReactElement, options: RenderWithProvidersOptions = {}) {
  const { route = "/", path, auth = authValue(), queryClient = createTestQueryClient(), ...rest } = options;
  function Wrapper({ children }: { children: ReactNode }) {
    const routed = path ? (
      <Routes>
        <Route path={path} element={children} />
      </Routes>
    ) : (
      children
    );
    return (
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={auth}>
          <MetaContext.Provider value={TEST_META}>
            <ToastProvider>
              <MemoryRouter initialEntries={[route]}>{routed}</MemoryRouter>
            </ToastProvider>
          </MetaContext.Provider>
        </AuthContext.Provider>
      </QueryClientProvider>
    );
  }
  return { ...render(ui, { wrapper: Wrapper, ...rest }), queryClient };
}
