import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { Button, IconButton, LinkButton } from "./Button";

describe("Button", () => {
  it("renders a type=button element with its accessible name and handles clicks", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save changes</Button>);
    const button = screen.getByRole("button", { name: "Save changes" });
    expect(button).toHaveAttribute("type", "button");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled, busy and shows the loading text while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading loadingText="Saving…" onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveTextContent("Saving…");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("supports submit type and the danger variant without losing the name", () => {
    render(
      <Button type="submit" variant="danger">
        Delete
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toHaveAttribute("type", "submit");
  });
});

describe("IconButton", () => {
  it("exposes the label as accessible name and title", () => {
    render(<IconButton label="Close dialog" icon={<svg aria-hidden="true" />} />);
    const button = screen.getByRole("button", { name: "Close dialog" });
    expect(button).toHaveAttribute("title", "Close dialog");
  });
});

describe("LinkButton", () => {
  it("renders a real link (navigation, not an action)", () => {
    render(
      <MemoryRouter>
        <LinkButton to="/map">Open the map</LinkButton>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Open the map" })).toHaveAttribute("href", "/map");
  });
});
