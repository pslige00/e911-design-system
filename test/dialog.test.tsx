import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Button, DangerDialog, Dialog } from "../src/index";

/**
 * dialog.tsx — Dialog and DangerDialog.
 *
 * LEFT TO PLAYWRIGHT, and this is the largest carve-out in the suite: THE FOCUS
 * TRAP. `focusableWithin` filters on `getClientRects().length > 0`, and jsdom
 * returns an empty list for every element in the document — so in this
 * environment a Dialog believes it contains nothing focusable and falls back to
 * focusing the panel. Every assertion about where focus LANDS, where Tab wraps,
 * and what happens when a footer button disables itself under the operator's
 * finger would therefore pass or fail for reasons that have nothing to do with
 * the trap. Those live in the browser harness; what is settled here is the
 * markup that makes the dialog a dialog, plus the two side effects that are
 * plain DOM writes.
 */

describe("Dialog", () => {
  it("renders nothing while closed", () => {
    const { container } = render(
      <Dialog open={false} onClose={() => {}} title="Correct punch">
        body
      </Dialog>
    );
    expect(container.firstChild).toBeNull();
  });

  it("is a modal dialog named by its title", () => {
    render(
      <Dialog open onClose={() => {}} title="Correct punch">
        body
      </Dialog>
    );
    const panel = screen.getByRole("dialog", { name: "Correct punch" });
    // aria-modal is the promise; the trap is what keeps it. SKILL.md rule 10 is
    // blunt about claiming modality you cannot keep — a screen reader will not
    // describe the page behind a dialog that says this.
    expect(panel.getAttribute("aria-modal")).toBe("true");
    // The title is an h2: a dialog is a section of the page, and the page's h1
    // is the Ribbon's.
    expect(screen.getByRole("heading", { level: 2, name: "Correct punch" })).toBeTruthy();
    // -1 so the panel itself can take focus when there is nothing inside to hold it.
    expect(panel.getAttribute("tabindex")).toBe("-1");
  });

  it("wires the description only when there is one", () => {
    const { rerender } = render(
      <Dialog open onClose={() => {}} title="Correct punch" description="This edits the record.">
        body
      </Dialog>
    );
    const panel = screen.getByRole("dialog");
    const describedBy = panel.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe(
      "This edits the record."
    );
    rerender(
      <Dialog open onClose={() => {}} title="Correct punch">
        body
      </Dialog>
    );
    // A dangling aria-describedby points at nothing and is announced as nothing.
    expect(screen.getByRole("dialog").getAttribute("aria-describedby")).toBeNull();
  });

  it("closes on Escape and on the close button", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Correct punch">
        body
      </Dialog>
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("dismisses on the backdrop unless the flow says otherwise", () => {
    // mousedown, not click: a drag that starts inside the panel and ends on the
    // backdrop (selecting text) must not count as a dismiss.
    const onClose = vi.fn();
    const { rerender } = render(
      <Dialog open onClose={onClose} title="Correct punch">
        body
      </Dialog>
    );
    const backdrop = screen.getByRole("dialog").parentElement as HTMLElement;
    fireEvent.mouseDown(backdrop);
    expect(onClose).toHaveBeenCalledOnce();

    rerender(
      <Dialog open onClose={onClose} title="Correct punch" dismissOnBackdrop={false}>
        body
      </Dialog>
    );
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not dismiss on a press that started inside the panel", () => {
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Correct punch">
        body
      </Dialog>
    );
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("locks and restores the page's scroll", () => {
    // A plain style write, so jsdom settles it exactly. The count behind it is
    // module-level because a DangerDialog can be stacked on a Dialog, and
    // without it the inner one's unmount unlocks the page under the outer.
    expect(document.body.style.overflow).toBe("");
    const { unmount } = render(
      <Dialog open onClose={() => {}} title="Correct punch">
        body
      </Dialog>
    );
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("renders the footer's actions", () => {
    render(
      <Dialog
        open
        onClose={() => {}}
        title="Correct punch"
        footer={
          <>
            <Button variant="secondary">Cancel</Button>
            <Button>Save</Button>
          </>
        }
      >
        body
      </Dialog>
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
  });
});

describe("DangerDialog", () => {
  const open = (props: Record<string, unknown> = {}) =>
    render(
      <DangerDialog
        open
        onClose={() => {}}
        onConfirm={() => {}}
        title="Delete unit"
        confirmWord="KC-1119"
        {...props}
      />
    );

  it("starts disarmed", () => {
    // The typed word converts an accidental tap into a deliberate act, which is
    // the whole reason this component exists rather than a Dialog with a red
    // button in it.
    open();
    expect((screen.getByRole("button", { name: "Delete" }) as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it("arms on the word, trimmed and case-insensitively", () => {
    // A stray capital on a tablet keyboard is not evidence of a mistake; the
    // intent is proven by typing the word.
    open();
    const field = screen.getByLabelText("Type the word to confirm");
    fireEvent.change(field, { target: { value: "  kc-1119 " } });
    expect((screen.getByRole("button", { name: "Delete" }) as HTMLButtonElement).disabled).toBe(
      false
    );
  });

  it("stays disarmed on a near miss", () => {
    open();
    fireEvent.change(screen.getByLabelText("Type the word to confirm"), {
      target: { value: "KC-1118" },
    });
    expect((screen.getByRole("button", { name: "Delete" }) as HTMLButtonElement).disabled).toBe(
      true
    );
  });

  it("refuses the backdrop", () => {
    // Off for destructive flows — a mis-tap on a wall tablet must not discard work.
    const onClose = vi.fn();
    open({ onClose });
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows the work in flight and holds the confirm", () => {
    open({ busy: true });
    const confirm = screen.getByRole("button", { name: "Working…" }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });
});
