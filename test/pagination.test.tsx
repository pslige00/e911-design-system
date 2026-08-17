import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Pagination, paginationSlots } from "../src/index";

/**
 * pagination.tsx — page numbers and the two steps.
 *
 * `paginationSlots` is exported and pure, which makes the window arithmetic the
 * one thing in this component that can be pinned exactly: the window is a FIXED
 * WIDTH so the control does not reflow under the finger as the pages change, and
 * an off-by-one there moves every button sideways at the moment someone is
 * pressing one.
 *
 * LEFT TO PLAYWRIGHT: that every target is a real 44px box rather than a 32px
 * control with an overhanging hit area. That distinction is the reason this
 * component is written the way it is — the buttons sit shoulder to shoulder, and
 * overlapping hit areas land the operator on page 7 when they aimed at 6 — and
 * it is exactly the kind of thing jsdom would report as 0×0 and call equal.
 */

describe("paginationSlots", () => {
  it("lists every page while they all fit", () => {
    expect(paginationSlots(1, 5, 1)).toEqual([1, 2, 3, 4, 5]);
    expect(paginationSlots(3, 7, 1)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("returns nothing to render for one page or none", () => {
    expect(paginationSlots(1, 1, 1)).toEqual([1]);
    expect(paginationSlots(1, 0, 1)).toEqual([]);
  });

  it("keeps first, last and a window, with gaps for the rest", () => {
    expect(paginationSlots(9, 20, 1)).toEqual([1, "gap", 8, 9, 10, "gap", 20]);
  });

  it("spells out a run rather than printing a gap that saves nothing", () => {
    // A "…" standing in for a single page is one more thing to read and one
    // fewer thing to press.
    expect(paginationSlots(2, 20, 1)).toEqual([1, 2, 3, "gap", 20]);
    expect(paginationSlots(19, 20, 1)).toEqual([1, "gap", 18, 19, 20]);
  });

  it("holds the same slot count as the page walks the middle", () => {
    // The no-reflow contract, stated as arithmetic.
    const widths = [5, 9, 12, 16].map((page) => paginationSlots(page, 20, 1).length);
    expect(new Set(widths).size).toBe(1);
  });

  it("widens with siblingCount", () => {
    expect(paginationSlots(10, 20, 2)).toEqual([1, "gap", 8, 9, 10, 11, 12, "gap", 20]);
  });
});

describe("Pagination", () => {
  it("renders nothing for a single page", () => {
    const { container } = render(
      <Pagination page={1} pageCount={1} onPageChange={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("is a named navigation landmark", () => {
    render(<Pagination page={2} pageCount={5} onPageChange={() => {}} />);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeTruthy();
  });

  it("marks the current page with aria-current, not just a fill", () => {
    // The border and fill alone say nothing; aria-current is what makes this the
    // *current* page rather than a pressed button.
    render(<Pagination page={2} pageCount={5} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Page 2" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "Page 3" }).getAttribute("aria-current")).toBeNull();
  });

  it("names each numeral so it is not read as a bare digit", () => {
    render(<Pagination page={2} pageCount={5} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Page 5" }).textContent).toBe("5");
  });

  it("disables the step that would leave the range", () => {
    const { rerender } = render(<Pagination page={1} pageCount={5} onPageChange={() => {}} />);
    expect((screen.getByRole("button", { name: /Prev/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Next/ }) as HTMLButtonElement).disabled).toBe(false);
    rerender(<Pagination page={5} pageCount={5} onPageChange={() => {}} />);
    expect((screen.getByRole("button", { name: /Prev/ }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: /Next/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("dims a disabled step through the shared tokens, not an opacity", () => {
    // Opacity fades the label, the 1.5px chip border and the chevron by one
    // factor, so the whole arrow recedes together and a dispatcher at arm's
    // length cannot read WHICH direction is unavailable.
    render(<Pagination page={1} pageCount={5} onPageChange={() => {}} />);
    const prev = screen.getByRole("button", { name: /Prev/ });
    expect(prev.className).toContain("disabled:text-disabled-fg");
    expect(prev.className).not.toContain("opacity-45");
    // :hover still matches a disabled button, so without this the arrow
    // repaints under the finger and reads as clickable.
    expect(prev.className).toContain("disabled:hover:bg-disabled");
  });

  it("steps and jumps", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={3} pageCount={9} onPageChange={onPageChange} />);
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(onPageChange).toHaveBeenLastCalledWith(4);
    fireEvent.click(screen.getByRole("button", { name: /Prev/ }));
    expect(onPageChange).toHaveBeenLastCalledWith(2);
    fireEvent.click(screen.getByRole("button", { name: "Page 9" }));
    expect(onPageChange).toHaveBeenLastCalledWith(9);
  });

  it("hides the ellipsis from assistive technology", () => {
    // "…" is a rendering of absence, not a destination.
    const { container } = render(
      <Pagination page={9} pageCount={20} onPageChange={() => {}} />
    );
    const gaps = container.querySelectorAll("li[aria-hidden]");
    expect(gaps).toHaveLength(2);
    expect(gaps[0]?.textContent).toBe("…");
  });
});
