import { describe, expect, it } from "vitest";
import { DOMAIN_EDGE, RAIL_PINNED_STORAGE_KEY, RAIL_PIN_LABEL, cn } from "../src/index";

/**
 * contract.ts — the data half of the system, imported here FROM THE PACKAGE
 * ROOT rather than from "./contract" on purpose. The root is what a consumer
 * writes, and the whole reason this module exists is that routing these values
 * through a `"use client"` module hands a server component a client-reference
 * proxy instead of the value. That failure cannot be reproduced in jsdom (there
 * is no server boundary here), so this file only pins the VALUES; the boundary
 * itself is a Next.js fact and belongs to the consuming app's own smoke page.
 */

describe("cn", () => {
  it("joins the truthy parts with single spaces", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("drops false, null and undefined", () => {
    // The three falsy shapes every component in this package relies on:
    // `flush && "e911-card-flush"`, a ternary's `null` arm, and an optional
    // `className` prop that was not passed.
    expect(cn("a", false, "b", null, undefined, "c")).toBe("a b c");
    expect(cn(false, null, undefined)).toBe("");
  });

  it("is a plain join and NOT tailwind-merge", () => {
    // Load-bearing, and documented as such in half a dozen components: because
    // conflicting utilities BOTH land in the class attribute, the cascade — not
    // argument order — picks the winner. Every `enabled:aria-invalid:border-bad`
    // and every `disabled:` compound in this package exists to win that fight on
    // specificity. If `cn` ever started de-duplicating, those escalations would
    // become dead weight and the bugs they fixed would come back silently.
    expect(cn("border-line-control", "border-bad")).toBe("border-line-control border-bad");
  });
});

describe("DOMAIN_EDGE", () => {
  it("keeps the two hues TimeSweep owns", () => {
    // Not arbitrary constants: one domain, one hue, across every E911 app. A
    // change here re-colours a different product's cards.
    expect(DOMAIN_EDGE.operations).toBe("orange");
    expect(DOMAIN_EDGE.roster).toBe("teal");
  });

  it("assigns six domains six distinct hues", () => {
    const hues = Object.values(DOMAIN_EDGE);
    expect(hues).toHaveLength(6);
    expect(new Set(hues).size).toBe(6);
  });
});

describe("rail constants", () => {
  it("keeps one storage key across every E911 app", () => {
    // A dispatcher who pins the rail in one app has expressed a preference
    // about rails. Rename this and every app reads a different key: the pin
    // silently resets on every app boundary, with nothing to show for it.
    expect(RAIL_PINNED_STORAGE_KEY).toBe("e911.rail-pinned");
  });

  it("names the pin without naming its state", () => {
    // The button carries aria-pressed. A label that flipped to "Unpin" would
    // announce the state twice and invert it for anyone hearing only one.
    expect(RAIL_PIN_LABEL).toBe("Pin navigation");
  });
});
