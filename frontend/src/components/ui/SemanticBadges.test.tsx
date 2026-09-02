import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/test/utils";
import { CategoryBadge, PriorityBadge, RiskBadge, SourceBadge, StatusBadge } from "./SemanticBadges";

describe("semantic badges", () => {
  it("always render text, with colours from the maps and category colours from the API", () => {
    renderWithProviders(
      <>
        <StatusBadge status="UNDER_REVIEW" />
        <PriorityBadge priority={null} />
        <RiskBadge level="HIGH" demo />
        <RiskBadge level={null} />
        <CategoryBadge category="WATERLOGGING" />
        <SourceBadge source="seed" />
      </>,
    );
    expect(screen.getByText("Under review")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText(/High risk/)).toHaveTextContent("High risk (demo model)");
    expect(screen.getByText("No estimate")).toBeInTheDocument();
    expect(screen.getByText("Demo data")).toBeInTheDocument();
    const category = screen.getByText("Waterlogging");
    expect(category.style.borderColor).toContain("rgb(13, 148, 136)");
  });
});
