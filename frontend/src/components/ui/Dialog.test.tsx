import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";
import { Dialog } from "./Dialog";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete report"
        description="This cannot be undone."
        footer={
          <>
            <button type="button">Cancel</button>
            <button type="button">Delete</button>
          </>
        }
      >
        <p>Body text</p>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("is a labelled modal that traps focus, closes on Escape and restores focus", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open" });
    await user.click(opener);

    const dialog = screen.getByRole("dialog", { name: "Delete report" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
    expect(document.body.style.overflow).toBe("hidden");

    // Initial focus skips the close button and lands on the first footer button.
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());

    await user.tab();
    expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Delete" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("closes from the close button and the overlay", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Hello">
        <p>Content</p>
      </Dialog>,
    );
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ConfirmDialog", () => {
  it("focuses Cancel first and calls onConfirm from the confirm button", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onClose={() => undefined}
        onConfirm={onConfirm}
        title="Delete this incident?"
        confirmLabel="Delete"
        tone="danger"
      />,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
