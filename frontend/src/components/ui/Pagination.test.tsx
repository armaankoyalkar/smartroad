import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";
import { paginationRange } from "./paginationRange";

describe("paginationRange", () => {
  it("lists every page when there are few", () => {
    expect(paginationRange(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("adds ellipses around the current page in long ranges", () => {
    expect(paginationRange(1, 20)).toEqual([1, 2, 3, 4, 5, "ellipsis-right", 20]);
    expect(paginationRange(10, 20)).toEqual([1, "ellipsis-left", 9, 10, 11, "ellipsis-right", 20]);
    expect(paginationRange(20, 20)).toEqual([1, "ellipsis-left", 16, 17, 18, 19, 20]);
  });

  it("handles zero pages and out-of-range pages", () => {
    expect(paginationRange(3, 0)).toEqual([]);
    expect(paginationRange(99, 3)).toEqual([1, 2, 3]);
  });
});

describe("Pagination", () => {
  it("renders the summary, marks the current page and disables edges", async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={5} total={95} limit={20} onPageChange={onPageChange} />);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
    expect(screen.getByText(/Showing/)).toHaveTextContent("Showing 1 to 20 of 95 results");
    expect(screen.getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
    await userEvent.click(screen.getByRole("button", { name: "Page 4" }));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it("disables next on the last page and shows the right summary", () => {
    render(<Pagination page={5} totalPages={5} total={95} limit={20} onPageChange={() => undefined} />);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByText(/Showing/)).toHaveTextContent("Showing 81 to 95 of 95 results");
  });

  it("renders nothing when there is a single page and no summary", () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPageChange={() => undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows ellipses for long ranges", () => {
    render(<Pagination page={10} totalPages={30} onPageChange={() => undefined} />);
    expect(screen.getByRole("button", { name: "Page 30" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Page 20" })).not.toBeInTheDocument();
  });
});
