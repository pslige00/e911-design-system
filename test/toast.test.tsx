import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { ToastProvider, useToast } from "../src/index";

/**
 * toast.tsx — the transient message layer.
 *
 * The contract this file exists for is the one the component itself got wrong
 * until 1.9.0: BOTH LIVE REGIONS ARE MOUNTED FROM FIRST RENDER AND EMPTY. NVDA
 * and JAWS announce a change of content inside a region that was ALREADY THERE;
 * a region created together with its text is a coin toss. The role used to live
 * on the toast card, which is created already populated, so four of the five
 * tones were announced by luck.
 *
 * LEFT TO PLAYWRIGHT: that the viewport is `position: fixed` and outranks a
 * dialog's stacking context, and that hovering a toast pauses its timer (the
 * timer is real here, but "the pointer is resting on it" is not something jsdom
 * can be honest about).
 */

function Harness() {
  const { toast } = useToast();
  return (
    <>
      <button type="button" onClick={() => toast({ tone: "ok", word: "Saved", message: "Timesheet saved." })}>
        save
      </button>
      <button type="button" onClick={() => toast({ tone: "bad", word: "Failed", message: "Punch was refused." })}>
        fail
      </button>
    </>
  );
}

const regions = (container: HTMLElement) => ({
  polite: container.querySelector('[aria-live="polite"]') as HTMLElement,
  assertive: container.querySelector('[aria-live="assertive"]') as HTMLElement,
});

describe("ToastProvider", () => {
  it("mounts both live regions, empty, before there is any news", () => {
    const { container } = render(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    );
    const { polite, assertive } = regions(container);
    expect(polite.getAttribute("role")).toBe("status");
    expect(assertive.getAttribute("role")).toBe("alert");
    // aria-atomic so the word and the message are read as one sentence.
    expect(polite.getAttribute("aria-atomic")).toBe("true");
    expect(assertive.getAttribute("aria-atomic")).toBe("true");
    expect(polite.textContent).toBe("");
    expect(assertive.textContent).toBe("");
  });

  it("announces a routine toast politely and leaves the assertive slot alone", () => {
    // Two slots, not one, so a routine "Saved" landing a second after a failure
    // does not blank the assertive region before the reader has finished it.
    const { container } = render(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    const { polite, assertive } = regions(container);
    expect(polite.textContent).toBe("Saved. Timesheet saved.");
    expect(assertive.textContent).toBe("");
  });

  it("interrupts for a failure", () => {
    // `bad` is an interruption — a failed dispatch write cannot wait for the
    // reader to finish the current phrase. The test in the component is
    // deliberately `=== "bad"` rather than a per-tone map, so a sixth tone
    // announces politely by default: the safe end of the choice.
    const { container } = render(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "fail" }));
    const { polite, assertive } = regions(container);
    expect(assertive.textContent).toBe("Failed. Punch was refused.");
    expect(polite.textContent).toBe("");
  });

  it("replaces the announced node when the same message repeats", () => {
    // The sequence key. React reuses a child whose key has not changed, so the
    // same message twice in a row would be no DOM mutation at all and the second
    // would pass in silence.
    const { container } = render(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    const first = regions(container).polite.firstElementChild;
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    const second = regions(container).polite.firstElementChild;
    expect(first).not.toBe(second);
  });

  it("hides the card's own copy of the text, but not its controls", () => {
    // The live region has already said both, and a reader browsing the page
    // should not meet them a second time. Scoped to the text rather than the
    // card: an aria-hidden card would take the Undo and Dismiss buttons with it,
    // which is an axe `aria-hidden-focus` violation and a toast a blind operator
    // cannot dismiss.
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    expect(screen.getByRole("button", { name: "Dismiss notification" })).toBeTruthy();
    const dismiss = screen.getByRole("button", { name: "Dismiss notification" });
    const card = dismiss.closest("div[class*='shadow-pop']") as HTMLElement;
    expect(card.getAttribute("aria-hidden")).toBeNull();
    expect(card.querySelector('[aria-hidden="true"]')?.textContent).toContain("Timesheet saved.");
  });

  it("dismisses by hand", () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "save" }));
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByRole("button", { name: "Dismiss notification" })).toBeNull();
  });

  it("drops the oldest past `max`", () => {
    // A stack taller than this blocks the content it is reporting on.
    render(
      <ToastProvider max={2}>
        <Harness />
      </ToastProvider>
    );
    const save = screen.getByRole("button", { name: "save" });
    fireEvent.click(save);
    fireEvent.click(save);
    fireEvent.click(save);
    expect(screen.getAllByRole("button", { name: "Dismiss notification" })).toHaveLength(2);
  });

  it("runs the action and then closes", () => {
    const onClick = vi.fn();
    function WithAction() {
      const { toast } = useToast();
      return (
        <button
          type="button"
          onClick={() =>
            toast({ tone: "ok", word: "Saved", message: "Punch corrected.", action: { label: "Undo", onClick } })
          }
        >
          go
        </button>
      );
    }
    render(
      <ToastProvider>
        <WithAction />
      </ToastProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: "go" }));
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });
});

describe("useToast", () => {
  it("refuses to run without a provider", () => {
    // Silently returning a no-op would be worse: every toast in the app would
    // vanish and the screens would look correct.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useToast())).toThrow(
      "useToast() requires a <ToastProvider> above it."
    );
    spy.mockRestore();
  });
});
