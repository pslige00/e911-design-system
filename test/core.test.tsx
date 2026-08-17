import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Button, CertChip, Chip, StatusTag } from "../src/index";

/**
 * core.tsx — Button, Chip, StatusTag, CertChip.
 *
 * LEFT TO PLAYWRIGHT, deliberately: every painted dimension. `h-ctl` vs `h-tap`
 * is a token, and whether the box that lands on screen is 32 or 44px depends on
 * tokens.css, on `@media (pointer: coarse)`, and on a stylesheet jsdom never
 * loads. Asserting `element.offsetHeight === 44` here would read 0 and pass for
 * a reason that has nothing to do with the control. What CAN be settled here is
 * WHICH class the component chose, which is the half this package decides.
 */

describe("Button", () => {
  it("renders a real <button>, not a div with a click handler", () => {
    render(<Button>Clock in</Button>);
    const button = screen.getByRole("button", { name: "Clock in" });
    expect(button.tagName).toBe("BUTTON");
  });

  it("defaults to type=button", () => {
    // The regression this blocks is not cosmetic: a bare <button> inside a form
    // is type=submit, so a "Cancel" or a "Add row" would submit the form. The
    // component overrides it and lets a caller ask for submit explicitly.
    render(<Button>Cancel</Button>);
    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
    render(<Button type="submit">Save</Button>);
    expect(screen.getByRole("button", { name: "Save" }).getAttribute("type")).toBe("submit");
  });

  it("paints each variant from its own token pair", () => {
    const { rerender } = render(<Button variant="primary">Go</Button>);
    expect(screen.getByRole("button").className).toContain("bg-action");
    rerender(<Button variant="danger">Go</Button>);
    // text-bad-fg, never text-white: --status-bad inverts between themes and a
    // fixed white label measured 2.95:1 in dark.
    const danger = screen.getByRole("button").className;
    expect(danger).toContain("bg-bad");
    expect(danger).toContain("text-bad-fg");
    expect(danger).not.toContain("text-white");
  });

  it("labels every size from --font-size-control, never --font-size-body", () => {
    // 1.10.0. --font-size-control is the one token that rises to 16px under
    // `@media (pointer: coarse)`; on text-body the Button was the only member of
    // the control family the touch bump could not reach, and "Clock in" carried
    // a 13.5px label on a wall tablet beside a 16px Select trigger.
    for (const size of ["md", "tap"] as const) {
      const { unmount } = render(<Button size={size}>Clock in</Button>);
      expect(screen.getByRole("button").className).toContain("text-control");
      unmount();
    }
  });

  it("wraps at tap and holds one line at sm/md", () => {
    // `whitespace-nowrap` is in this component's own class string, so a caller
    // passing a wrapping utility loses to it every time — which is why `wrap` is
    // a prop at all. Measured before it existed: a 41-character label at 332.8px
    // in a 180px column.
    const { rerender } = render(<Button size="md">A very long label indeed</Button>);
    expect(screen.getByRole("button").className).toContain("whitespace-nowrap");
    rerender(<Button size="tap">A very long label indeed</Button>);
    const tap = screen.getByRole("button").className;
    expect(tap).toContain("whitespace-normal");
    // A min-height, not a fixed height: `h-tap` on a wrapped label just overflows.
    expect(tap).toContain("min-h-tap");
  });

  it("carries the shared disabled treatment rather than an opacity", () => {
    // 1.7.0 ended three components each reaching for their own `opacity-45`.
    // Opacity fades the LABEL as hard as the fill, and a dispatcher still has to
    // read WHICH action is unavailable — Approve greyed out and Reject greyed
    // out are not the same screen.
    render(<Button disabled>Approve</Button>);
    const button = screen.getByRole("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.className).toContain("disabled:text-disabled-fg");
    expect(button.className).not.toContain("opacity-45");
  });
});

describe("Chip", () => {
  it("carries its state in aria-pressed, not only in its fill", () => {
    const { rerender } = render(<Chip>Open</Chip>);
    expect(screen.getByRole("button", { name: "Open", pressed: false })).toBeTruthy();
    rerender(<Chip active>Open</Chip>);
    expect(screen.getByRole("button", { name: "Open", pressed: true })).toBeTruthy();
  });

  it("fires its handler", () => {
    const onClick = vi.fn();
    render(<Chip onClick={onClick}>Open</Chip>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("StatusTag", () => {
  it("renders pill + dot + word, never colour alone", () => {
    const { container } = render(<StatusTag tone="warn">Late</StatusTag>);
    const tag = container.firstElementChild as HTMLElement;
    // The word is required by the type; this asserts it actually reaches the DOM.
    expect(tag.textContent).toContain("Late");
    // The dot is the non-colour half a dichromat reads, and it is aria-hidden
    // because it says nothing a screen reader has not already been told.
    const dot = tag.querySelector("[aria-hidden]");
    expect(dot).not.toBeNull();
    expect(dot?.className).toContain("size-tag-dot");
  });

  it("gives every tone its own fill/text pair", () => {
    for (const tone of ["ok", "warn", "bad", "info", "neutral"] as const) {
      const { container, unmount } = render(<StatusTag tone={tone}>Word</StatusTag>);
      const className = (container.firstElementChild as HTMLElement).className;
      expect(className, tone).toContain(`bg-${tone}-soft`);
      expect(className, tone).toContain(`text-${tone}`);
      unmount();
    }
  });
});

describe("CertChip", () => {
  it("puts the severity word in what a screen reader reads", () => {
    // 1.10.0, WCAG 1.4.1. The chip has no role, so it has no accessible NAME to
    // hang a title or aria-description on — its text content is the only thing a
    // reader will ever say about it. The leading comma is part of the contract:
    // "EMD 21d warning" is one phrase, "EMD 21d, warning" is two.
    const { container } = render(<CertChip tone="warn">EMD 21d</CertChip>);
    expect(container.textContent).toBe("EMD 21d, warning");
  });

  it("says nothing extra for the tones that paint no rule", () => {
    // ok and neutral mean "routine", and announcing "routine" on every badge
    // number in a table is noise, not access.
    for (const tone of ["ok", "neutral"] as const) {
      const { container, unmount } = render(<CertChip tone={tone}>KC-1119</CertChip>);
      expect(container.textContent, tone).toBe("KC-1119");
      unmount();
    }
  });

  it("takes the app's word over the generic one, and an empty one as silence", () => {
    const { container, rerender } = render(
      <CertChip tone="bad" toneLabel="expired">
        TDD
      </CertChip>
    );
    expect(container.textContent).toBe("TDD, expired");
    // The documented escape for a code that already says it:
    // <CertChip tone="bad">TDD expired</CertChip> must not announce "critical".
    rerender(
      <CertChip tone="bad" toneLabel="">
        TDD expired
      </CertChip>
    );
    expect(container.textContent).toBe("TDD expired");
  });

  it("draws the left rule that survives greyscale and forced colours", () => {
    // The width ramp — nothing, 4px, 8px — is the non-colour carrier. Simulating
    // deuteranopia on the real tokens, warn and bad borders converge from ΔRGB
    // 84 to 21 in dark, so hue alone was carrying almost nothing.
    const rules: Record<string, string | null> = {
      neutral: null,
      ok: null,
      info: "border-l-4",
      warn: "border-l-8",
      bad: "border-l-8",
    };
    for (const [tone, rule] of Object.entries(rules)) {
      const { container, unmount } = render(
        <CertChip tone={tone as "ok"}>KC</CertChip>
      );
      const className = (container.firstElementChild as HTMLElement).className;
      if (rule) expect(className, tone).toContain(rule);
      else expect(className, tone).not.toContain("border-l-");
      unmount();
    }
  });
});
