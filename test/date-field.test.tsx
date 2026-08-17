import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DateField, formatIsoDate, parseIsoDate, todayIsoDate } from "../src/index";

/**
 * date-field.tsx — the typed date and its calendar.
 *
 * The helpers below are pure and are the reason this component exists at all:
 * `new Date("2026-08-14")` is parsed as UTC midnight and read back through
 * `.toISOString()` as the 13th in every timezone west of Greenwich, which is all
 * of them here. A shift roster off by one day is a real incident.
 *
 * LEFT TO PLAYWRIGHT: where the calendar popover is placed and whether it
 * escapes a card's `overflow-hidden`; the 44px day cells and the 2px gutters
 * 1.10.0 opened between them; and the focus landing that `useAnchoredLayer`
 * makes racy — the popover mounts `visibility: hidden` for one frame and
 * `focus()` on a hidden element is a silent no-op, which is why the component
 * retries on rAF. jsdom has no visibility to be hidden BY, so a green "focus
 * landed on the cursor cell" here would prove nothing about the bug it fixed.
 */

describe("parseIsoDate", () => {
  it("accepts a real date", () => {
    expect(parseIsoDate("2026-08-14")).toEqual({ y: 2026, m: 8, d: 14 });
  });

  it("rejects a day that does not exist in that month", () => {
    // Strict on purpose: a lenient parser turns 2026-02-30 into March 2nd, and
    // the operator is never told which day the form filed.
    expect(parseIsoDate("2026-02-30")).toBeNull();
    expect(parseIsoDate("2026-04-31")).toBeNull();
    expect(parseIsoDate("2026-13-01")).toBeNull();
    expect(parseIsoDate("2026-00-10")).toBeNull();
  });

  it("gets the leap rule right in all three branches", () => {
    expect(parseIsoDate("2024-02-29")).not.toBeNull(); // divisible by 4
    expect(parseIsoDate("2100-02-29")).toBeNull(); // century, not by 400
    expect(parseIsoDate("2000-02-29")).not.toBeNull(); // by 400
  });

  it("rejects anything that is not YYYY-MM-DD", () => {
    for (const text of ["14/08/2026", "next tue", "2026-8-14", "", "2026-08-14T00:00"]) {
      expect(parseIsoDate(text), text).toBeNull();
    }
  });
});

describe("formatIsoDate", () => {
  it("zero-pads so lexicographic comparison is date comparison", () => {
    // Half the reason the value is carried as a string: `min`/`max` are compared
    // with `<` and `>`.
    expect(formatIsoDate({ y: 2026, m: 8, d: 4 })).toBe("2026-08-04");
    expect(formatIsoDate({ y: 26, m: 12, d: 31 })).toBe("0026-12-31");
  });
});

describe("todayIsoDate", () => {
  it("reads today through the LOCAL getters", () => {
    // The one sanctioned use of Date in the module. `getUTCDate()` here would
    // reintroduce the exact off-by-one the file exists to prevent, and it would
    // be invisible to anyone testing east of Greenwich or at midday.
    const now = new Date();
    const expected = `${String(now.getFullYear()).padStart(4, "0")}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(todayIsoDate()).toBe(expected);
  });
});

describe("DateField", () => {
  const field = (props: Record<string, unknown> = {}) =>
    render(<DateField value="" onChange={() => {}} aria-label="First day off" {...props} />);

  it("is a text input that says what shape it wants", () => {
    field({ value: "2026-08-14" });
    const input = screen.getByRole("textbox", { name: "First day off" }) as HTMLInputElement;
    expect(input.value).toBe("2026-08-14");
    expect(input.placeholder).toBe("YYYY-MM-DD");
    // Mono + tabular even while it is being typed: the columns have to stay put.
    expect(input.className).toContain("tabular-nums");
  });

  it("keeps text that is not a date, and says so, rather than reverting it", () => {
    // NOTHING TYPED IS EVER DISCARDED SILENTLY. Until 1.5.0 both refusal paths
    // reverted the draft and fired nothing: the operator watched their entry
    // turn back into the old one and the app was never told.
    const onChange = vi.fn();
    const onReject = vi.fn();
    field({ onChange, onReject });
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "next tue" } });
    fireEvent.blur(input);
    expect(onReject).toHaveBeenCalledWith({ text: "next tue", reason: "unparseable" });
    // No ISO string exists to emit, so onChange stays quiet rather than sending
    // garbage up a prop documented as YYYY-MM-DD.
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe("next tue");
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });

  it("emits an out-of-range date through BOTH channels", () => {
    // The wage record this cost: a leave form with min={startDate} on its end
    // date silently restored the start date when an employee typed an earlier
    // one, the form still read "1 day", and twelve hours were filed against a
    // date nobody entered. A component cannot know an app's error copy, so it
    // must not be the thing that decides an entry never happened.
    const onChange = vi.fn();
    const onReject = vi.fn();
    field({ value: "2026-08-20", min: "2026-08-15", onChange, onReject });
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "2026-08-01" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("2026-08-01");
    expect(onReject).toHaveBeenCalledWith({
      text: "2026-08-01",
      value: "2026-08-01",
      reason: "before-min",
      limit: "2026-08-15",
    });
  });

  it("names the bound that refused it", () => {
    const onReject = vi.fn();
    field({ value: "", max: "2026-08-15", onReject });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "2026-09-01" } });
    fireEvent.blur(screen.getByRole("textbox"));
    expect(onReject.mock.calls[0]?.[0]).toMatchObject({ reason: "after-max", limit: "2026-08-15" });
  });

  it("reports a blacked-out day as unavailable", () => {
    const onReject = vi.fn();
    field({ isDateDisabled: (iso: string) => iso === "2026-12-25", onReject });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "2026-12-25" } });
    fireEvent.blur(screen.getByRole("textbox"));
    expect(onReject.mock.calls[0]?.[0]).toMatchObject({ reason: "unavailable" });
  });

  it("withdraws the refusal as soon as the operator edits", () => {
    // They are answering it.
    field({ onReject: () => {} });
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "nope" } });
    fireEvent.blur(input);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(input, { target: { value: "n" } });
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("normalises a clear to an empty string, once", () => {
    const onChange = vi.fn();
    field({ value: "2026-08-14", onChange });
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("takes the invalid state from the app's channel too", () => {
    // 1.10.0. Before it, `aria-invalid` reached the input only through the rest
    // spread — and because the spread sits AFTER the component's own attribute,
    // a FormField with no error spread `undefined` over the field's OWN refusal
    // mark and un-announced it.
    field({ invalid: true });
    expect(screen.getByRole("textbox").getAttribute("aria-invalid")).toBe("true");
  });

  it("opens a calendar dialog from a labelled button", () => {
    field({ value: "2026-08-14" });
    const button = screen.getByRole("button", { name: "Choose date" });
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(button);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("dialog", { name: "Choose date" })).toBeTruthy();
  });

  it("renders six full weeks, always", () => {
    // A five-row month next to a six-row one would resize the popover under the
    // pointer mid-selection.
    field({ value: "2026-08-14" });
    fireEvent.click(screen.getByRole("button", { name: "Choose date" }));
    expect(screen.getAllByRole("columnheader")).toHaveLength(7);
    expect(screen.getAllByRole("gridcell")).toHaveLength(42);
    expect(screen.getByRole("grid")).toBeTruthy();
  });

  it("names each day in full and marks the chosen one on the cell", () => {
    field({ value: "2026-08-14" });
    fireEvent.click(screen.getByRole("button", { name: "Choose date" }));
    const day = screen.getByRole("button", { name: "14 August 2026" });
    // aria-selected rides on the gridcell, not on the button, so the state is
    // where the grid pattern says it is — never colour alone.
    expect((day.parentElement as HTMLElement).getAttribute("aria-selected")).toBe("true");
    // Roving tabindex: the grid is one tab stop and the arrows walk it.
    expect(day.getAttribute("tabindex")).toBe("0");
  });

  it("walks the grid with the arrow keys, across a month boundary", () => {
    field({ value: "2026-08-01" });
    fireEvent.click(screen.getByRole("button", { name: "Choose date" }));
    const grid = screen.getByRole("grid");
    fireEvent.keyDown(grid, { key: "ArrowLeft" });
    // July 31st is in the previous month, so the whole view has to follow.
    expect(screen.getByRole("button", { name: "31 July 2026" }).getAttribute("tabindex")).toBe("0");
    expect(screen.getByText("July 2026")).toBeTruthy();
  });

  it("commits a picked day and closes", () => {
    const onChange = vi.fn();
    field({ value: "2026-08-14", onChange });
    fireEvent.click(screen.getByRole("button", { name: "Choose date" }));
    fireEvent.click(screen.getByRole("button", { name: "20 August 2026" }));
    expect(onChange).toHaveBeenCalledWith("2026-08-20");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("never offers a refused day", () => {
    const onChange = vi.fn();
    field({ value: "2026-08-14", min: "2026-08-10", onChange });
    fireEvent.click(screen.getByRole("button", { name: "Choose date" }));
    const blocked = screen.getByRole("button", { name: "3 August 2026" });
    expect(blocked.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(blocked);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes on Escape without taking an enclosing Dialog with it", () => {
    field({ value: "2026-08-14" });
    fireEvent.click(screen.getByRole("button", { name: "Choose date" }));
    const escape = fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(escape).toBe(false); // preventDefault(): one layer per press
  });

  it("stays shut while disabled", () => {
    field({ disabled: true });
    const button = screen.getByRole("button", { name: "Choose date" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect((screen.getByRole("textbox") as HTMLInputElement).disabled).toBe(true);
  });
});
