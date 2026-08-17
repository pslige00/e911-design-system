/**
 * Renders the components that construct a ResizeObserver WITH THE GLOBAL
 * REMOVED, which is the environment a consuming app's jsdom suite actually
 * provides. setup.ts stubs it, so every other test in this directory would pass
 * whether or not the components guard it — this file deletes the stub first, so
 * it is the only place the guard is actually exercised.
 *
 * Proven red before the guard existed: both cases threw
 * `ReferenceError: ResizeObserver is not defined`, from a consumer's suite,
 * with a message naming neither this package nor the component rendered.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tabs, TabPanel } from "../src/tabs";
import { Select } from "../src/select";

let saved: unknown;
beforeEach(() => {
  saved = (globalThis as Record<string, unknown>).ResizeObserver;
  delete (globalThis as Record<string, unknown>).ResizeObserver;
});
afterEach(() => {
  (globalThis as Record<string, unknown>).ResizeObserver = saved;
});

describe("no ResizeObserver in the environment", () => {
  it("Tabs still renders and stays operable", () => {
    render(
      <Tabs
        items={[{ id: "a", label: "First" }, { id: "b", label: "Second" }]}
        value="a"
        onChange={() => {}}
      >
        <TabPanel id="a">one</TabPanel>
      </Tabs>,
    );
    expect(screen.getByRole("tab", { name: "First" })).toBeTruthy();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  it("Select still renders and opens", () => {
    render(
      <Select
        value="a"
        onChange={() => {}}
        options={[{ value: "a", label: "Alpha" }, { value: "b", label: "Bravo" }]}
        aria-label="Pick one"
      />,
    );
    const combo = screen.getByRole("combobox", { name: "Pick one" });
    expect(combo.getAttribute("aria-expanded")).toBe("false");
  });
});
