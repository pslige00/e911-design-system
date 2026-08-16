/**
 * The parts of the system that are DATA, not components — and therefore must
 * stay outside the client boundary.
 *
 * This file deliberately has no "use client". Everything that renders does, and
 * a plain value exported from a "use client" module is not a plain value to a
 * React Server Component: it arrives as a client-reference proxy. Reading
 * `DOMAIN_EDGE.operations` across that boundary yields something that is not
 * "orange", so `DomainCard` matches no hue and silently renders a 4px top border
 * in the default border colour — no error, no warning, just the wrong card.
 *
 * That is a real bug TimeSweep hit in its first week. Keeping the contract here
 * means a server component can import it directly and get the string.
 */

/* ------------------------------------------------------------------ types */
export type Tone = "ok" | "warn" | "bad";
export type EdgeColor = "orange" | "teal" | "gold" | "green" | "plum" | "blue";

/** Domain → edge-color contract (see SKILL.md). One domain, one hue, everywhere. */
export const DOMAIN_EDGE: Record<
  "operations" | "roster" | "certifications" | "qa" | "training" | "facilities",
  EdgeColor
> = {
  operations: "orange",
  roster: "teal",
  certifications: "gold",
  qa: "green",
  training: "plum",
  facilities: "blue",
};

/* ------------------------------------------------------------------- rail */
/**
 * Where an app stores the rail's pin. One key across every E911 app, because a
 * dispatcher who pins the rail in TimeSweep and then opens the QA app on the
 * same wall tablet has expressed a preference about rails, not about TimeSweep.
 * AppShell deliberately does NOT read or write it: the shell renders on the
 * server first, and a component that reaches for localStorage during render is
 * a hydration mismatch. Persisting is the app's call — see SKILL.md.
 */
export const RAIL_PINNED_STORAGE_KEY = "e911.rail-pinned";

/**
 * The pin's accessible name. Constant across both states BY DESIGN: the button
 * carries `aria-pressed`, and flipping the label to "Unpin" as well announces
 * the state twice and inverts it for anyone who hears only one of the two.
 * Here rather than in shell.tsx so a server component can label a skeleton rail
 * with the same string.
 */
export const RAIL_PIN_LABEL = "Pin navigation";

/* ---------------------------------------------------------------- utils -- */
/**
 * Class-name join. Lives here rather than in core.tsx for the same reason as
 * DOMAIN_EDGE: a server component that imports a function from a client module
 * gets a proxy it cannot call.
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
