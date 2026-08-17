import { describe, expect, it, vi } from "vitest";
import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { Tooltip } from "../src/index";

/**
 * `fireEvent.pointerEnter` does NOT reach React's `onPointerEnter`: React
 * synthesises enter/leave from `pointerover`/`pointerout` delegated at the root,
 * so dispatching the enter event itself calls nothing and every assertion after
 * it would be green about an interaction that never happened. And jsdom's
 * PointerEvent (when it has one) ignores `pointerType` in its init, which is the
 * one field the touch guard reads — so it is defined on the event by hand.
 */
function hover(node: Element, pointerType: "mouse" | "touch") {
  const event = createEvent.pointerOver(node, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  fireEvent(node, event);
}

/**
 * tooltip.tsx — the label the 64px icon rail promises.
 *
 * LEFT TO PLAYWRIGHT: WCAG 1.4.13 Hoverable, which is the half of this component
 * that took the most work. The bubble sits 8px from its trigger with dead space
 * between, so it stays up on a 250ms grace period AND by hearing pointer events
 * itself; both halves are needed and neither can be shown in jsdom, where there
 * is no pointer, no travel, and the bubble has no position to travel to. Also
 * left there: the flip when the bubble would hang off the viewport, and that
 * pointer focus does NOT open it (`:focus-visible` is a browser judgement —
 * jsdom's `matches(":focus-visible")` is not the same question).
 *
 * What this file holds is the arrangement that makes the description reachable
 * at all, which is the part that would break silently.
 */

describe("Tooltip", () => {
  it("mounts the described-by target from the start, and points the trigger at it", () => {
    // The visible bubble is a second, aria-hidden copy; only this one reaches the
    // accessibility tree. A tooltip that only enters the DOM after the focus
    // event is announced late or not at all.
    render(
      <Tooltip content="Sign out">
        <button type="button">exit</button>
      </Tooltip>
    );
    const trigger = screen.getByRole("button", { name: "exit" });
    const tip = screen.getByRole("tooltip", { hidden: true });
    expect(tip.textContent).toBe("Sign out");
    expect(trigger.getAttribute("aria-describedby")).toBe(tip.id);
    // sr-only, not display:none — a description in a display:none node is not
    // computed by every AT.
    expect(tip.className).toContain("sr-only");
  });

  it("shows one bubble on hover and takes it away on a press", () => {
    // The press is the interaction; a bubble left hanging over the page you just
    // navigated to is what makes a tooltip feel broken.
    const { container } = render(
      <Tooltip content="Sign out" delay={0}>
        <button type="button">exit</button>
      </Tooltip>
    );
    const trigger = screen.getByRole("button", { name: "exit" });
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0);
    hover(trigger, "mouse");
    const bubble = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(bubble.textContent).toBe("Sign out");
    fireEvent.pointerDown(trigger);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it("does not open under a finger", () => {
    // Touch has no hover: a tooltip that opens under the finger only hides what
    // was just tapped. (KNOWN GAP, recorded in the component: `content` is then
    // unreachable for a sighted touch user, so do not put a fact in a Tooltip
    // that is stated nowhere else.)
    const { container } = render(
      <Tooltip content="Sign out" delay={0}>
        <button type="button">exit</button>
      </Tooltip>
    );
    hover(screen.getByRole("button"), "touch");
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it("closes on Escape while merely hovering", () => {
    // The listener is on the DOCUMENT, not the trigger: Escape has to work when
    // focus is somewhere else entirely.
    const { container } = render(
      <Tooltip content="Sign out" delay={0}>
        <button type="button">exit</button>
      </Tooltip>
    );
    hover(screen.getByRole("button"), "mouse");
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it("keeps the trigger's own handlers", () => {
    // cloneElement replaces six props; a component that swallowed the caller's
    // click would break every rail destination it wraps.
    const onPointerEnter = vi.fn();
    const onClick = vi.fn();
    render(
      <Tooltip content="Sign out" delay={0}>
        <button type="button" onPointerEnter={onPointerEnter} onClick={onClick}>
          exit
        </button>
      </Tooltip>
    );
    const trigger = screen.getByRole("button");
    hover(trigger, "mouse");
    fireEvent.click(trigger);
    expect(onPointerEnter).toHaveBeenCalledOnce();
    expect(onClick).toHaveBeenCalledOnce();
  });
});
