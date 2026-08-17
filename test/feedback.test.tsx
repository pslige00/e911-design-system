import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button, EmptyState, Skeleton } from "../src/index";

/**
 * feedback.tsx — EmptyState, Skeleton. The two states a screen is in before it
 * has anything to show.
 *
 * LEFT TO PLAYWRIGHT: that a `row` skeleton actually holds --row-height, which
 * is the whole point of it (a loading table must occupy the height the loaded
 * one will, or the page reflows under the pointer when the rows land). jsdom
 * gives every box a height of 0, so only the class can be settled here.
 */

describe("EmptyState", () => {
  it("renders the title as emphasised text and NOT as a heading", () => {
    // Deliberate, at any rung: an EmptyState almost always renders inside a
    // DomainCard that already owns a heading, and a component that plants an h3
    // wherever it lands re-opens the outline decision one card at a time — a
    // failure invisible until someone runs the outline.
    render(<EmptyState title="No exceptions in this pay period" />);
    expect(screen.getByText("No exceptions in this pay period")).toBeTruthy();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("renders the reason and the exit", () => {
    // An empty state with a reachable exit is a screen; one without is a dead
    // end, and a dead end is where an operator starts inventing a workaround.
    render(
      <EmptyState
        title="No exceptions"
        body="Punches are matched overnight."
        action={<Button>Open last period</Button>}
      />
    );
    expect(screen.getByText("Punches are matched overnight.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open last period" })).toBeTruthy();
  });

  it("hides a decorative icon from the accessibility tree", () => {
    // A lucide glyph has no accessible name worth announcing ahead of the title,
    // and every icon set eventually ships one that does.
    const { container } = render(
      <EmptyState title="No exceptions" icon={<svg data-testid="glyph" />} />
    );
    const wrapper = container.querySelector("[aria-hidden]") as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.querySelector("svg")).not.toBeNull();
  });
});

describe("Skeleton", () => {
  it("is hidden from assistive technology", () => {
    // A skeleton is a picture of content that does not exist yet; announcing it
    // gives a screen-reader user a table of blanks to walk through. The LOADING
    // state belongs on the container, as aria-busy.
    const { container } = render(<Skeleton />);
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.getAttribute("aria-hidden")).toBe("true");
  });

  it("stops its pulse under reduced motion rather than leaving it to the global rule", () => {
    // NOT redundant with tokens.css: that rule clamps every animation to 0.01ms,
    // which stops a transition but leaves an infinite pulse running — the
    // browser then samples it at an arbitrary point every frame and the bar
    // strobes between full and half opacity. Faster motion than before the user
    // asked for less.
    const { container } = render(<Skeleton />);
    const className = (container.firstElementChild as HTMLElement).className;
    expect(className).toContain("animate-pulse");
    expect(className).toContain("motion-reduce:animate-none");
  });

  it("paints a full table row at size=row", () => {
    const { container } = render(<Skeleton size="row" />);
    expect((container.firstElementChild as HTMLElement).className).toContain("h-row");
  });
});
