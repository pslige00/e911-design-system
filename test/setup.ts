import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/* ==========================================================================
   What jsdom does not have, and what each stub is and is not evidence of.

   Every entry below is a browser API this package's components CALL during a
   plain render. Without it the component throws and the test file dies on
   import-time noise rather than on the contract it was written for — which is
   the failure mode that makes a suite look like it is testing something when
   it is testing its own scaffolding.

   None of these stubs measures anything. They make the components run; the
   assertions are all on DOM structure, attributes and callbacks, which is the
   only class of fact jsdom can actually settle.
   ========================================================================== */

afterEach(cleanup);

/**
 * ResizeObserver. Three components construct one during a normal render or
 * open: `Tabs` (on mount, to decide which edge of the strip is faded),
 * `Select`/`DateField` through `useAnchoredLayer` (on open), and `DataTable`
 * (which is the only one that GUARDS the constructor — see the comment in
 * data.tsx, which already anticipates exactly this environment).
 *
 * FINDING, not fixed here: that guard exists in data.tsx and nowhere else. In
 * jsdom, `<Tabs>` throws `ReferenceError: ResizeObserver is not defined` on
 * mount and `<Select>` throws the moment it opens. That is not a browser
 * defect — every browser has ResizeObserver — but it does mean any consuming
 * app's own jsdom unit tests take a hard failure the instant they render a
 * Tabs, a Select or a DateField, with a message that points at neither this
 * package nor their test setup. Reported to the parent; the fix belongs in
 * tabs.tsx and select.tsx, which are owned by other agents this round.
 *
 * `observed` + `trigger` exist so ONE test can drive DataTable's measured
 * scroll region (data.test.tsx). That test defines `scrollWidth` on the real
 * node and then fires the callback, so the component's own comparison runs for
 * real — the fiction is the layout engine, not the logic under test.
 */
const observers = new Set<{ cb: ResizeObserverCallback; targets: Set<Element> }>();

class TestResizeObserver implements ResizeObserver {
  private record: { cb: ResizeObserverCallback; targets: Set<Element> };
  constructor(cb: ResizeObserverCallback) {
    this.record = { cb, targets: new Set() };
    observers.add(this.record);
  }
  observe(target: Element) {
    this.record.targets.add(target);
  }
  unobserve(target: Element) {
    this.record.targets.delete(target);
  }
  disconnect() {
    observers.delete(this.record);
  }
}
globalThis.ResizeObserver = TestResizeObserver;

/** Fire every live observer, as a real one would after a layout change. */
export function fireResizeObservers(): void {
  for (const { cb, targets } of observers) {
    cb(
      Array.from(targets, (target) => ({ target }) as ResizeObserverEntry),
      {} as ResizeObserver
    );
  }
}

/**
 * scrollIntoView. `Tabs` calls it on every arrow-key move (the strip has to
 * drag the focused tab into view) and `Select` calls it on the active option.
 * jsdom leaves it undefined, so both are a TypeError on a keystroke.
 *
 * A spy, not a no-op: whether it is called at all is a real contract — a tab
 * focused outside a scrolled strip is WCAG 2.4.11 — even though WHERE it lands
 * is layout and therefore Playwright's.
 */
Element.prototype.scrollIntoView = vi.fn();

/**
 * matchMedia. jsdom implements no media queries at all, and `AppShell` reads
 * `(min-width: 48rem)` into React state on mount because two things depend on
 * it that CSS cannot express: whether the drawer closes on the way UP past `md`
 * (leave it and a drawer opened at 700px keeps <main> inert after the viewport
 * grows — a tablet rotating to landscape), and whether the rail is `inert`.
 *
 * Defaults to WIDE, which is what the component seeds its own state with for
 * the server render, so the shell under test is the desk-machine one unless a
 * test says otherwise. `setViewportWide(false)` before a render is what makes
 * the DRAWER exist at all — and that is not a workaround, it is the actual
 * contract: above `md` the shell closes the drawer on the next commit, which is
 * why four drawer assertions failed against a hard-wired stub the first time
 * this suite ran.
 *
 * It must be set BEFORE render: the stub's `addEventListener` is inert, so a
 * change after mount reaches nothing. Nothing below `md` that lives in CSS —
 * the panel's `max-md:invisible`, the slide, the mobile bar — is evaluated
 * here at any width.
 */
let viewportWide = true;

/** Reports the shell's `(min-width: 48rem)` query as matching, or not. */
export function setViewportWide(wide: boolean): void {
  viewportWide = wide;
}

afterEach(() => {
  viewportWide = true;
});

window.matchMedia = ((query: string) => ({
  get matches() {
    return viewportWide;
  },
  media: query,
  onchange: null,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;
