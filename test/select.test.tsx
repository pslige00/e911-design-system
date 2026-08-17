import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Select } from "../src/index";

/**
 * select.tsx — the select-only combobox.
 *
 * LEFT TO PLAYWRIGHT: everything about the popover as a LAYER. Where it is
 * placed, whether it flips above the trigger when the room below runs out,
 * whether it escapes a DomainCard's `overflow-hidden`, and the 2px gutters
 * between rows are all `getBoundingClientRect` arithmetic, and jsdom returns
 * zeros for all of it. Also left there: WCAG 2.5.2 pointer cancellation — that a
 * press which slides off a row and lifts on another commits nothing — because it
 * depends on Chromium firing `click` on the nearest common ancestor of the down
 * and up targets, which jsdom does not model.
 *
 * What this file settles is the ARIA state machine, which is what a screen
 * reader actually consumes and what `tsc` cannot see at all.
 */

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Charlie", disabled: true },
];

describe("Select", () => {
  it("is a combobox with a listbox behind it", () => {
    render(<Select value={null} onChange={() => {}} options={options} aria-label="Shift code" />);
    const trigger = screen.getByRole("combobox", { name: "Shift code" });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.getAttribute("type")).toBe("button");
    expect(trigger.getAttribute("aria-haspopup")).toBe("listbox");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    // No list in the DOM while closed, so aria-controls would dangle.
    expect(trigger.getAttribute("aria-controls")).toBeNull();
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("shows the placeholder until something is chosen", () => {
    const { rerender } = render(
      <Select value={null} onChange={() => {}} options={options} placeholder="Any shift" aria-label="Shift" />
    );
    expect(screen.getByRole("combobox").textContent).toContain("Any shift");
    rerender(<Select value="b" onChange={() => {}} options={options} aria-label="Shift" />);
    expect(screen.getByRole("combobox").textContent).toContain("Beta");
  });

  it("opens on click and announces the active option through the trigger", () => {
    // Focus STAYS on the trigger and the active option is announced through
    // aria-activedescendant — the ARIA select-only combobox pattern. That keeps
    // one tab stop and avoids the focus ping-pong of moving DOM focus into the
    // list.
    render(<Select value={null} onChange={() => {}} options={options} aria-label="Shift" />);
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    const list = screen.getByRole("listbox");
    expect(trigger.getAttribute("aria-controls")).toBe(list.id);
    const rows = screen.getAllByRole("option");
    expect(rows.map((r) => r.textContent)).toEqual(["Alpha", "Beta", "Charlie"]);
    expect(trigger.getAttribute("aria-activedescendant")).toBe(rows[0]?.id);
  });

  it("marks the chosen option, and marks it in more than colour", () => {
    render(<Select value="b" onChange={() => {}} options={options} aria-label="Shift" />);
    fireEvent.click(screen.getByRole("combobox"));
    const rows = screen.getAllByRole("option");
    expect(rows[1]?.getAttribute("aria-selected")).toBe("true");
    expect(rows[0]?.getAttribute("aria-selected")).toBe("false");
    // --surface-selected, not --surface-tint: both states were tint, so an
    // option the pointer merely rested on was painted exactly like the one the
    // operator had chosen. On a list of shift codes that is a wrong pick waiting
    // to happen. The weight and the check mark are the non-colour halves.
    expect(rows[1]?.className).toContain("bg-selected");
    expect(rows[1]?.className).toContain("font-semibold");
    expect(rows[1]?.querySelector("svg")).not.toBeNull();
  });

  it("marks a disabled option aria-disabled and refuses to commit it", () => {
    const onChange = vi.fn();
    render(<Select value={null} onChange={onChange} options={options} aria-label="Shift" />);
    fireEvent.click(screen.getByRole("combobox"));
    const charlie = screen.getAllByRole("option")[2] as HTMLElement;
    expect(charlie.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(charlie);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("combobox").getAttribute("aria-expanded")).toBe("true");
  });

  it("commits a click on an enabled option and closes", () => {
    const onChange = vi.fn();
    render(<Select value={null} onChange={onChange} options={options} aria-label="Shift" />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getAllByRole("option")[1] as HTMLElement);
    expect(onChange).toHaveBeenCalledWith("b");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("walks the list with the arrow keys, stepping past disabled rows", () => {
    const onChange = vi.fn();
    render(<Select value={null} onChange={onChange} options={options} aria-label="Shift" />);
    const trigger = screen.getByRole("combobox");
    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // opens on the first enabled
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // Alpha -> Beta
    fireEvent.keyDown(trigger, { key: "ArrowDown" }); // Charlie is disabled: stay
    expect(trigger.getAttribute("aria-activedescendant")).toBe(
      (screen.getAllByRole("option")[1] as HTMLElement).id
    );
    fireEvent.keyDown(trigger, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("jumps by typeahead", () => {
    // Single-character repeats cycle through same-initial options, which is how
    // a native select behaves and how dispatchers expect to jump.
    const onChange = vi.fn();
    render(<Select value={null} onChange={onChange} options={options} aria-label="Shift" />);
    // Closed, a typeahead match commits directly — the native behaviour.
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "b" });
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("closes on Escape without letting an enclosing Dialog hear it", () => {
    // One layer per press: the handler stops propagation so a Select inside a
    // Dialog does not take the dialog down with it.
    render(<Select value={null} onChange={() => {}} options={options} aria-label="Shift" />);
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);
    const escape = fireEvent.keyDown(trigger, { key: "Escape", bubbles: true, cancelable: true });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(escape).toBe(false); // preventDefault() was called
  });

  it("takes the invalid state from either channel", () => {
    // 1.10.0. `invalid` painted the border and a caller's `aria-invalid` — which
    // is all FormField sends — reached only the accessibility tree, so an
    // errored Select was announced invalid and drawn valid. Two channels
    // disagreeing about one fact is worse than either being absent.
    const { rerender } = render(
      <Select value={null} onChange={() => {}} options={options} invalid aria-label="Shift" />
    );
    expect(screen.getByRole("combobox").getAttribute("aria-invalid")).toBe("true");
    rerender(
      <Select value={null} onChange={() => {}} options={options} aria-invalid aria-label="Shift" />
    );
    const trigger = screen.getByRole("combobox");
    expect(trigger.getAttribute("aria-invalid")).toBe("true");
    // The escalation that survives a caller's className: FormField hands its
    // child `border-line-control`, `cn` is a plain join, and the two are each
    // (0,1,0) so the SHEET's order decides — for grey, measured, in both themes.
    // Keying off the attribute makes it (0,3,0).
    expect(trigger.className).toContain("enabled:aria-invalid:border-bad");
  });

  it("does not open while disabled", () => {
    render(<Select value={null} onChange={() => {}} options={options} disabled aria-label="Shift" />);
    const trigger = screen.getByRole("combobox") as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    fireEvent.click(trigger);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("says so when there is nothing to choose", () => {
    render(<Select value={null} onChange={() => {}} options={[]} aria-label="Shift" />);
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByText("No options")).toBeTruthy();
  });

  it("draws no focus treatment of its own", () => {
    // The suppressed outline was the dangerous half: it never actually erased
    // the system indicator, but only because that rule is UNLAYERED. Put it in a
    // layer, or let a consuming app order @layer differently, and this control
    // loses its keyboard focus ring entirely — a 2.4.7 failure whose trigger
    // lives outside this repo.
    render(<Select value={null} onChange={() => {}} options={options} aria-label="Shift" />);
    const className = screen.getByRole("combobox").className;
    expect(className).not.toContain("outline-none");
    expect(className).not.toContain("focus:border");
  });
});
