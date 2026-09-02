import type * as AnalyticsApi from "@/api/analytics";
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getPublicStats } from "@/api/analytics";
import { authenticatedAs, renderWithProviders, TEST_USER } from "@/test/utils";
import LandingPage from "../LandingPage";

vi.mock("@/api/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof AnalyticsApi>()),
  getPublicStats: vi.fn(),
}));

// The Leaflet preview is not rendered in jsdom; the section around it is.
vi.mock("@/features/public/landing/MapPreview", () => ({
  MapPreview: () => <div data-testid="map-preview">map preview</div>,
}));

const statsMock = vi.mocked(getPublicStats);

describe("LandingPage", () => {
  beforeEach(() => {
    statsMock.mockReset();
  });

  it("renders every section with the tagline and calls to action", async () => {
    statsMock.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<LandingPage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Making Roads Smarter. Making Travel Safer.",
    );
    for (const heading of [
      "Reports that are scattered cannot be verified, tracked or studied",
      "Report, verify, resolve",
      "What the platform includes",
      "See where incidents are reported",
      "Two roles, one record of every incident",
      "Built with a standard, open stack",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByText("Hotspot analysis (DBSCAN)")).toBeInTheDocument();
    expect(screen.getByText("Risk estimation (Random Forest)")).toBeInTheDocument();
    expect(screen.getByText("Balaji Lakshmipathi")).toBeInTheDocument();
    expect(screen.getByText("Aruja Jyothi Ma'am")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Report an incident" })).toHaveAttribute(
      "href",
      "/login?returnTo=%2Fapp%2Freport",
    );
    expect(screen.getByRole("link", { name: "Explore the map" })).toHaveAttribute("href", "/map");
    expect(await screen.findByTestId("map-preview")).toBeInTheDocument();
  });

  it("sends signed-in users straight to the report form", () => {
    statsMock.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<LandingPage />, { auth: authenticatedAs(TEST_USER) });
    expect(screen.getByRole("link", { name: "Report an incident" })).toHaveAttribute("href", "/app/report");
  });

  it("hides the statistics strip while loading and on error", async () => {
    statsMock.mockReturnValue(new Promise(() => {}));
    const { unmount } = renderWithProviders(<LandingPage />);
    expect(screen.queryByText("Reports filed")).not.toBeInTheDocument();
    unmount();

    statsMock.mockRejectedValue(new Error("down"));
    renderWithProviders(<LandingPage />);
    await screen.findByTestId("map-preview");
    expect(screen.queryByText("Reports filed")).not.toBeInTheDocument();
  });

  it("shows the public figures once loaded, including honest zeros", async () => {
    statsMock.mockResolvedValue({
      reportsFiled: 12,
      reportsResolved: 4,
      reportsLast30Days: 3,
      resolvedLast30Days: 1,
      generatedAt: new Date().toISOString(),
    });
    const { unmount } = renderWithProviders(<LandingPage />);
    expect(await screen.findByText("Reports filed")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText(/demo data excluded/)).toBeInTheDocument();
    unmount();

    statsMock.mockResolvedValue({
      reportsFiled: 0,
      reportsResolved: 0,
      reportsLast30Days: 0,
      resolvedLast30Days: 0,
      generatedAt: new Date().toISOString(),
    });
    renderWithProviders(<LandingPage />);
    expect(await screen.findByText(/No citizen reports have been filed yet/)).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(4);
  });
});
