import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TabPanel, Tabs } from "../src/index";

/**
 * tabs.tsx — section tabs with automatic activation.
 *
 * LEFT TO PLAYWRIGHT, and it is most of what 1.10.x changed here: the strip is a
 * horizontal scroll container, and every fact about it is layout. Whether the
 * edge fade appears on the side that has more (it is keyed to a measured
 * `scrollWidth`), whether an arrow-keyed tab is scrolled fully into view rather
 * than 16px outside it, whether the active rule paints at all (it moved to
 * `after:bottom-0` because the box clips vertically — `overflow-y` computes to
 * `auto` the moment the other axis is not `visible`, so the outer pixel sat in
 * the scrollable overflow region and never painted for the whole of 1.10.0), and
 * whether the focus indicator is drawn inward. jsdom has no scroll box, no
 * cascade and no `::after`.
 *
 * The keyboard MODEL, though — which tab moves where, what gets selected, what
 * is a tab stop — is a DOM fact, and that is what this file holds.
 */

const items = [
  { id: "coverage", label: "Coverage" },
  { id: "trades", label: "Trades" },
  { id: "open", label: "Open shifts", disabled: true },
];

function harness(activeId = "coverage", onChange = vi.fn()) {
  const result = render(
    <Tabs items={items} activeId={activeId} onChange={onChange} aria-label="Schedule views">
      <TabPanel tabId="coverage">Coverage body</TabPanel>
      <TabPanel tabId="trades">Trades body</TabPanel>
      <TabPanel tabId="open">Open body</TabPanel>
    </Tabs>
  );
  return { ...result, onChange };
}

describe("Tabs", () => {
  it("is a named tablist of real tabs", () => {
    harness();
    const list = screen.getByRole("tablist", { name: "Schedule views" });
    expect(list).toBeTruthy();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["Coverage", "Trades", "Open shifts"]);
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("false");
  });

  it("holds one tab stop for the whole set", () => {
    // Roving tabindex. Without it every tab is a Tab press of its own, and a
    // five-tab strip costs a keyboard operator five presses to walk past.
    harness();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
  });

  it("wires each tab to its own panel, in both directions", () => {
    // Derived ids rather than passed ones: a mismatched aria-controls is
    // invisible until a screen reader hits it.
    harness();
    const tab = screen.getAllByRole("tab")[0] as HTMLElement;
    const panel = screen.getByRole("tabpanel");
    expect(tab.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
  });

  it("renders only the active panel, and hides the rest", () => {
    harness();
    const panels = screen.getAllByRole("tabpanel", { hidden: true });
    expect(panels).toHaveLength(3);
    expect(panels[0]?.hasAttribute("hidden")).toBe(false);
    expect(panels[1]?.hasAttribute("hidden")).toBe(true);
    expect(screen.getByText("Coverage body")).toBeTruthy();
    expect(screen.queryByText("Trades body")).toBeNull();
    // Focusable so Tab out of the tablist lands on the panel; its body is often
    // a table with no focusable content of its own.
    expect(panels[0]?.getAttribute("tabindex")).toBe("0");
    expect(panels[1]?.getAttribute("tabindex")).toBe("-1");
  });

  it("moves and selects on the arrow keys, skipping disabled tabs", () => {
    // Selection follows focus (automatic activation), the APG default for panels
    // whose contents are already in the DOM.
    const { onChange } = harness();
    const tabs = screen.getAllByRole("tab");
    fireEvent.keyDown(tabs[0] as HTMLElement, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("trades");
    onChange.mockClear();
    // "Open shifts" is disabled, so ArrowRight from Trades wraps to Coverage.
    fireEvent.keyDown(tabs[1] as HTMLElement, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("coverage");
  });

  it("takes Home and End to the ends", () => {
    const { onChange } = harness("trades");
    const tabs = screen.getAllByRole("tab");
    fireEvent.keyDown(tabs[1] as HTMLElement, { key: "Home" });
    expect(onChange).toHaveBeenCalledWith("coverage");
    onChange.mockClear();
    // End lands on the last ENABLED tab, not the last one.
    fireEvent.keyDown(tabs[1] as HTMLElement, { key: "End" });
    expect(onChange).toHaveBeenCalledWith("trades");
  });

  it("drags the strip along to the tab it just focused", () => {
    // Not decoration: without it the strip's own overflow relocates the failure
    // — the document stops widening (1.4.10) but four ArrowRight presses still
    // park focus on a tab outside the strip's visible box (2.4.11), which is
    // what /schedule at 320px did. WHERE it lands is layout and belongs to the
    // browser harness; THAT it is asked for is settled here.
    harness();
    fireEvent.keyDown(screen.getAllByRole("tab")[0] as HTMLElement, { key: "ArrowRight" });
    // EXACTLY one, not "at least one": the tests above this one move focus
    // several times, and a count of 1 is also the assertion that `clearMocks`
    // is doing its job. `toHaveBeenCalled()` alone would pass on their history.
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("selects on click", () => {
    const { onChange } = harness();
    fireEvent.click(screen.getAllByRole("tab")[1] as HTMLElement);
    expect(onChange).toHaveBeenCalledWith("trades");
  });

  it("refuses to render a panel outside its tablist", () => {
    // The ids have to agree across two components; a TabPanel with no context
    // would silently render an unlabelled div claiming role=tabpanel.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TabPanel tabId="coverage">body</TabPanel>)).toThrow(
      "<TabPanel> must be rendered inside <Tabs>."
    );
    spy.mockRestore();
  });
});
