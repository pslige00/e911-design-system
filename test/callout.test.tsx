import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Callout } from "../src/index";

/**
 * callout.tsx — the message a screen attaches to a REGION OF ITSELF.
 *
 * `kind` is the prop this file is mostly about, because it is the one thing
 * neither the component nor the tone can work out, and both ways of getting it
 * wrong cost something: `role="alert"` on a standing note interrupts a screen
 * reader on every page load (one screen in the first consuming app carries seven
 * of them), and no role on an event refuses a credential in silence.
 *
 * LEFT TO PLAYWRIGHT: nothing here needs layout. The one thing this file cannot
 * settle is whether a reader ANNOUNCES the region — that is an AT behaviour, not
 * a DOM fact — so what is asserted is the markup that makes announcement
 * possible.
 */

describe("Callout", () => {
  it("is silent by default", () => {
    // The safe default: a Callout nobody classified costs one message. The other
    // default would cost the channel, because the operator's defence against
    // being interrupted seven times per page load is to tune it out.
    const { container } = render(<Callout tone="warn">Coverage is below minimum.</Callout>);
    const box = container.firstElementChild as HTMLElement;
    expect(box.getAttribute("role")).toBeNull();
    expect(box.getAttribute("aria-atomic")).toBeNull();
  });

  it("alerts for a bad event and merely states every other one", () => {
    // Where toast.tsx's rule stops applying: a toast is ALWAYS new, so tone is
    // the only open question there. Here newness and urgency are two questions.
    const { container, rerender } = render(
      <Callout tone="bad" kind="event">
        That PIN was not recognised.
      </Callout>
    );
    let box = container.firstElementChild as HTMLElement;
    expect(box.getAttribute("role")).toBe("alert");
    // Stated rather than left to the role's implied value: without it a reader
    // announces only the node that changed — the body alone, with the title that
    // scopes it left behind.
    expect(box.getAttribute("aria-atomic")).toBe("true");

    rerender(
      <Callout tone="ok" kind="event">
        Punch accepted.
      </Callout>
    );
    box = container.firstElementChild as HTMLElement;
    expect(box.getAttribute("role")).toBe("status");
  });

  it("names the severity for a screen reader, in text", () => {
    // The mark is the sighted reader's non-colour channel; this is everyone
    // else's. Without it the tone of a Callout is conveyed by colour alone to
    // the operator least able to use it.
    const { container } = render(<Callout tone="warn">Coverage is below minimum.</Callout>);
    expect(container.textContent).toBe("Warning: Coverage is below minimum.");
  });

  it("says nothing extra for neutral", () => {
    // "Known state, no valence" — there is no severity to name, and "Neutral:"
    // is noise.
    const { container } = render(<Callout tone="neutral">This period is closed.</Callout>);
    expect(container.textContent).toBe("This period is closed.");
  });

  it("draws a mark that differs by SHAPE, hidden from the reader that has the word", () => {
    // Five tones inside a 0.018 luminance band are five shades of one grey to a
    // dichromat. `warn` is the only triangle; the four circles differ by a
    // check, a cross, an i and a dash.
    const { container } = render(<Callout tone="info">An estimate.</Callout>);
    const mark = container.querySelector("svg") as SVGElement;
    expect(mark).not.toBeNull();
    expect(mark.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders the title as emphasised text, not a heading", () => {
    // Same reason as EmptyState: a Callout sits inside a DomainCard that already
    // owns the outline.
    render(
      <Callout tone="bad" title="Three shifts are unfilled">
        Body.
      </Callout>
    );
    expect(screen.getByText("Three shifts are unfilled")).toBeTruthy();
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("keeps a list inside the callout", () => {
    // A <ul> inside a <p> is a nesting error the browser fixes by closing the
    // paragraph early, which reparents half the message out of the callout.
    const { container } = render(
      <Callout tone="warn">
        <ul>
          <li>A shift</li>
        </ul>
      </Callout>
    );
    expect(container.querySelector("p ul")).toBeNull();
    expect(container.querySelector("li")?.textContent).toBe("A shift");
  });

  it("passes `id` through so a field can be described by it", () => {
    // The sign-in pattern: move focus to the first invalid input and describe it
    // with this node, so the sentence is read again on arrival — which also
    // covers the case where the alert fired before the AT was listening.
    const { container } = render(
      <Callout id="signin-error" tone="bad" kind="event">
        Refused.
      </Callout>
    );
    expect((container.firstElementChild as HTMLElement).id).toBe("signin-error");
  });
});
