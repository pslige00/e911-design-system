import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Checkbox, Radio } from "../src/index";

/**
 * choice.tsx — Checkbox and Radio, one implementation.
 *
 * The thing worth pinning here is that the NATIVE INPUT is the painted box
 * (`appearance: none`), not a visually-hidden input under a span that draws one.
 * Everything else in this file follows from that: the thing that is focused is
 * the thing that is painted, so the system's one focus indicator lands on it
 * with no local rule; `:checked`/`:indeterminate`/`:disabled` style the box
 * directly, so the paint cannot desync from the DOM.
 *
 * LEFT TO PLAYWRIGHT: the 44px row around the 18px box (the box is --check-size,
 * the TARGET is --tap-target, and they are deliberately not the same rectangle),
 * the forced-colors fallback, and that the tick survives on a disabled fill.
 */

describe("Checkbox", () => {
  it("is a real input, named by its label", () => {
    render(
      <Checkbox checked={false} onChange={() => {}}>
        I am volunteering for this shift.
      </Checkbox>
    );
    const box = screen.getByRole("checkbox", { name: "I am volunteering for this shift." });
    expect((box as HTMLInputElement).type).toBe("checkbox");
  });

  it("toggles from a click anywhere in the label row", () => {
    // The <label> IS the hit area — that is why the label is a child and not a
    // string prop. Label activation is the browser's, not ours.
    const onChange = vi.fn();
    render(
      <Checkbox checked={false} onChange={onChange}>
        Attested
      </Checkbox>
    );
    fireEvent.click(screen.getByText("Attested"));
    expect(onChange).toHaveBeenCalledOnce();
    // The boolean first, because that is what every call site actually wants;
    // the event second so a form handler can still reach name/value.
    expect(onChange.mock.calls[0]?.[0]).toBe(true);
    expect(onChange.mock.calls[0]?.[1]).toBeTruthy();
  });

  it("sets indeterminate through the DOM property", () => {
    // There is no HTML attribute for it, so React cannot set it from JSX. The
    // property is what makes the browser expose the state as MIXED rather than
    // as checked, so it is never announced as "checked" and never submits.
    render(
      <Checkbox checked={false} indeterminate onChange={() => {}}>
        All positions
      </Checkbox>
    );
    const box = screen.getByRole("checkbox") as HTMLInputElement;
    expect(box.indeterminate).toBe(true);
    expect(box.checked).toBe(false);
  });

  it("re-applies indeterminate after a user click clears it", () => {
    // A click clears the flag in the DOM; a controlled parent that still says
    // "mixed" must win.
    const { rerender } = render(
      <Checkbox checked={false} indeterminate onChange={() => {}}>
        All
      </Checkbox>
    );
    const box = screen.getByRole("checkbox") as HTMLInputElement;
    box.indeterminate = false;
    rerender(
      <Checkbox checked indeterminate onChange={() => {}}>
        All
      </Checkbox>
    );
    expect(box.indeterminate).toBe(true);
  });

  it("marks itself invalid for assistive technology, not only in red", () => {
    render(
      <Checkbox checked={false} invalid onChange={() => {}}>
        Attested
      </Checkbox>
    );
    const box = screen.getByRole("checkbox");
    expect(box.getAttribute("aria-invalid")).toBe("true");
    expect(box.className).toContain("border-bad");
  });

  it("dims a disabled control through a token, not an opacity", () => {
    // 1.7.0. Opacity dimmed the label THROUGH the card, and the label here is
    // not a word like "Save" — it is a three-line attestation an operator is
    // being asked to agree to.
    const { container } = render(
      <Checkbox checked={false} disabled onChange={() => {}}>
        Attested
      </Checkbox>
    );
    const row = container.querySelector("label") as HTMLElement;
    expect((screen.getByRole("checkbox") as HTMLInputElement).disabled).toBe(true);
    expect(row.className).toContain("text-disabled-fg");
    expect(row.className).not.toContain("opacity-45");
  });

  it("forwards a ref to the input itself", () => {
    // Not to the row: a consumer calling focus() or reportValidity() means the
    // control, and the row is a <label>.
    const ref = { current: null as HTMLInputElement | null };
    render(
      <Checkbox ref={ref} checked={false} onChange={() => {}}>
        Attested
      </Checkbox>
    );
    expect(ref.current?.tagName).toBe("INPUT");
  });
});

describe("Radio", () => {
  it("is a real radio carrying the group name", () => {
    // `name` is what makes a set of radios ONE control to the browser — one tab
    // stop, arrow keys moving the selection, one value in the form. A radio
    // without it is a checkbox that cannot be unchecked, and nothing warns you.
    render(
      <Radio name="kind" value="sick" checked onChange={() => {}}>
        Sick
      </Radio>
    );
    const radio = screen.getByRole("radio", { name: "Sick" }) as HTMLInputElement;
    expect(radio.type).toBe("radio");
    expect(radio.name).toBe("kind");
    expect(radio.checked).toBe(true);
  });

  it("hands its handler the value, not a boolean that is always true", () => {
    const onChange = vi.fn();
    render(
      <Radio name="kind" value="vacation" checked={false} onChange={onChange}>
        Vacation
      </Radio>
    );
    fireEvent.click(screen.getByRole("radio"));
    expect(onChange.mock.calls[0]?.[0]).toBe("vacation");
  });
});
