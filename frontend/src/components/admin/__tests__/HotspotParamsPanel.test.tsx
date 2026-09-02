import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EMPTY_MAP_FILTERS } from "@/components/map/mapFilterState";
import {
  DEFAULT_HOTSPOT_PARAMS,
  parseHotspotParams,
  serializeHotspotParams,
  validateHotspotDraft,
} from "@/features/admin/hotspotParams";
import { renderWithProviders } from "@/test/utils";
import { HotspotParamsPanel } from "../HotspotParamsPanel";

describe("hotspot parameter validation", () => {
  it("accepts values inside the documented bounds", () => {
    expect(validateHotspotDraft({ eps: "50", minSamples: "3" })).toEqual({
      values: { eps: 50, minSamples: 3 },
      errors: {},
    });
    expect(validateHotspotDraft({ eps: "2000", minSamples: "20" }).values).toEqual({
      eps: 2000,
      minSamples: 20,
    });
  });

  it("rejects eps outside 50..2000 and minSamples outside 3..20", () => {
    expect(validateHotspotDraft({ eps: "49", minSamples: "4" }).errors.eps).toBe(
      "Radius (eps) must be between 50 and 2000",
    );
    expect(validateHotspotDraft({ eps: "2001", minSamples: "4" }).errors.eps).toBe(
      "Radius (eps) must be between 50 and 2000",
    );
    expect(validateHotspotDraft({ eps: "200", minSamples: "2" }).errors.minSamples).toBe(
      "Minimum points must be between 3 and 20",
    );
    expect(validateHotspotDraft({ eps: "200", minSamples: "21" }).values).toBeNull();
    expect(validateHotspotDraft({ eps: "", minSamples: "4" }).errors.eps).toBe("Enter radius (eps)");
    expect(validateHotspotDraft({ eps: "12.5", minSamples: "4" }).errors.eps).toBe(
      "Radius (eps) must be a whole number",
    );
  });

  it("falls back to the defaults for missing or invalid URL values, per field", () => {
    expect(parseHotspotParams(new URLSearchParams(""))).toEqual(DEFAULT_HOTSPOT_PARAMS);
    expect(parseHotspotParams(new URLSearchParams("eps=5000&minSamples=6"))).toEqual({
      eps: 200,
      minSamples: 6,
    });
    expect(parseHotspotParams(new URLSearchParams("eps=300&minSamples=abc"))).toEqual({
      eps: 300,
      minSamples: 4,
    });
    expect(serializeHotspotParams({ eps: 200, minSamples: 8 })).toEqual({ eps: undefined, minSamples: "8" });
  });
});

describe("HotspotParamsPanel", () => {
  it("blocks Recompute on out-of-range values and commits valid ones", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    renderWithProviders(
      <HotspotParamsPanel
        values={DEFAULT_HOTSPOT_PARAMS}
        onCommit={onCommit}
        filters={EMPTY_MAP_FILTERS}
        onFiltersChange={vi.fn()}
      />,
    );
    const eps = screen.getByRole("spinbutton", { name: /Radius \(eps\)/ });
    await user.clear(eps);
    await user.type(eps, "10");
    await user.click(screen.getByRole("button", { name: "Recompute" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Radius (eps) must be between 50 and 2000");
    expect(eps).toHaveAttribute("aria-invalid", "true");
    expect(onCommit).not.toHaveBeenCalled();

    await user.clear(eps);
    await user.type(eps, "300");
    await user.click(screen.getByRole("button", { name: "Recompute" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onCommit).toHaveBeenCalledWith({ eps: 300, minSamples: 4 });
  });

  it("shares the category facet with the map filters", async () => {
    const user = userEvent.setup();
    const onFiltersChange = vi.fn();
    renderWithProviders(
      <HotspotParamsPanel
        values={DEFAULT_HOTSPOT_PARAMS}
        onCommit={vi.fn()}
        filters={EMPTY_MAP_FILTERS}
        onFiltersChange={onFiltersChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Pothole" }));
    expect(onFiltersChange).toHaveBeenCalledWith({ ...EMPTY_MAP_FILTERS, category: ["POTHOLE"] });
  });
});
