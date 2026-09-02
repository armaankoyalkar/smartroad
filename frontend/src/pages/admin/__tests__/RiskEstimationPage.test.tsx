import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/client";
import { authenticatedAs, renderWithProviders, TEST_ADMIN } from "@/test/utils";
import RiskEstimationPage from "../RiskEstimationPage";
import { MODEL_INFO, RISK_DISTRIBUTION } from "./fixtures";

vi.mock("@/api/ml", () => ({
  getModelInfo: vi.fn(),
  getRiskDistribution: vi.fn(),
  estimateRisk: vi.fn(),
  getIncidentRisk: vi.fn(),
  refreshRisk: vi.fn(),
}));

import * as ml from "@/api/ml";

function renderPage() {
  return renderWithProviders(<RiskEstimationPage />, {
    route: "/admin/risk",
    auth: authenticatedAs(TEST_ADMIN),
  });
}

describe("RiskEstimationPage", () => {
  beforeEach(() => {
    vi.mocked(ml.getModelInfo).mockResolvedValue(MODEL_INFO);
    vi.mocked(ml.getRiskDistribution).mockResolvedValue(RISK_DISTRIBUTION);
  });

  it("shows the whole-page unavailable state with retry when the ML service is down", async () => {
    vi.mocked(ml.getModelInfo).mockRejectedValue(
      new ApiError("ML_UNAVAILABLE", "The ML service is not reachable.", { status: 503 }),
    );
    renderPage();
    expect(await screen.findByRole("heading", { name: "ML service unavailable" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByText("Try an estimate")).not.toBeInTheDocument();
    // Stored estimates need no ML call, so that section still renders.
    expect(await screen.findByText(/132 of 144 incidents have a stored estimate/)).toBeInTheDocument();
  });

  it("explains that the model has not been trained when the artifacts are missing", async () => {
    vi.mocked(ml.getModelInfo).mockRejectedValue(
      new ApiError("ML_ERROR", "Model artifacts not found. Run the training pipeline first.", {
        status: 502,
      }),
    );
    renderPage();
    expect(await screen.findByRole("heading", { name: "Model not trained" })).toBeInTheDocument();
    expect(screen.getByText(/Run the training pipeline/)).toBeInTheDocument();
  });

  it("renders the dataset card, metrics, comparison and demo notices from model-info", async () => {
    renderPage();
    expect(await screen.findByText("SmartRoad demo incident dataset")).toBeInTheDocument();
    expect(screen.getByText("DEMO DATA")).toBeInTheDocument();
    expect(screen.getByText("Synthetic data; no real road conditions.")).toBeInTheDocument();
    expect(screen.getByText("RandomForestClassifier · version demo-rf-1.0.0")).toBeInTheDocument();
    expect(screen.getAllByText("0.812").length).toBeGreaterThan(0);
    expect(screen.getAllByText("0.774").length).toBeGreaterThan(0);
    expect(screen.getByText("Not the shipped model")).toBeInTheDocument();
    expect(screen.getByText("shipped")).toBeInTheDocument();
    const matrix = screen.getByRole("table", { name: /Confusion matrix/ });
    expect(within(matrix).getByText("540")).toBeInTheDocument();
    expect(screen.getByText(MODEL_INFO.disclaimer)).toBeInTheDocument();
  });

  it("validates the generated form against the feature ranges before calling the API", async () => {
    const user = userEvent.setup();
    renderPage();
    const hour = await screen.findByRole("spinbutton", { name: /Hour of day/ });
    await user.clear(hour);
    await user.type(hour, "30");
    const speed = screen.getByRole("spinbutton", { name: /Speed limit/ });
    await user.clear(speed);
    await user.type(speed, "10");
    await user.click(screen.getByRole("button", { name: "Estimate risk" }));

    expect(await screen.findByText("Hour must be between 0 and 23")).toBeInTheDocument();
    expect(screen.getByText("Speed limit must be between 20 and 120")).toBeInTheDocument();
    expect(ml.estimateRisk).not.toHaveBeenCalled();

    await user.clear(hour);
    await user.type(hour, "18");
    await user.clear(speed);
    await user.type(speed, "60");
    vi.mocked(ml.estimateRisk).mockResolvedValue({
      riskLevel: "HIGH",
      probabilities: { LOW: 0.12, MEDIUM: 0.33, HIGH: 0.55 },
      modelVersion: "demo-rf-1.0.0",
      isDemoModel: true,
      contributions: [{ feature: "speed_limit", value: 60, effect: 0.18 }],
      disclaimer: MODEL_INFO.disclaimer,
    });
    await user.click(screen.getByRole("button", { name: "Estimate risk" }));
    await waitFor(() =>
      // TanStack Query passes the mutation context as a second argument.
      expect(ml.estimateRisk).toHaveBeenCalledWith(
        expect.objectContaining({ hour: 18, speed_limit: 60 }),
        expect.anything(),
      ),
    );
    expect(await screen.findByText("High risk (demo model)")).toBeInTheDocument();
    expect(screen.getByText("55.0%")).toBeInTheDocument();
  });
});
