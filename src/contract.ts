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
/**
 * What a status MEANS. Widened from three to five in 1.7.0.
 *
 * The three-tone version was a deliberate constraint, and the argument for it
 * was sound: a status with no tone is a status the reader has to interpret. Two
 * tones were added anyway, because of what the constraint did to the tone that
 * absorbed everything it could not classify.
 *
 * Measured in the first consuming app before this change: `warn` was used 84
 * times across ~60 distinct labels, and roughly 17 of them were cautionary. The
 * rest were neutral classification ("Note", "Net", "Moves money", "Eligible")
 * and plain absence ("No timesheet", "Not configured", "No roster for this
 * date"). Gold meant "this needs attention" and "pay is not in question" on the
 * same screen. That ambiguity costs more, on a wall tablet at 3am, than a wider
 * union does.
 *
 * - `ok`      — the good, settled state. Nothing to do.
 * - `warn`    — caution. Something the operator should look at.
 * - `bad`     — failure, refusal, or a hard block.
 * - `info`    — a real fact worth reading that carries no judgement and needs
 *               no action. Classification, provenance, "this is an estimate".
 * - `neutral` — a known state with no valence at all, including absence.
 *
 * `neutral` is NOT an escape hatch, and this is the rule that keeps it from
 * becoming one: if the label would read exactly the same with no pill around
 * it, the answer is no pill, not a neutral one. A tone is a claim that the
 * state matters enough to mark. See SKILL.md.
 *
 * Every tone is still pill + dot + WORD, and that rule got MORE load-bearing
 * here, not less. All five light-theme tones sit between L=0.110 and L=0.128 —
 * a 0.018 luminance spread across the whole set. Each clears 4.5:1 on its own
 * fill, which is what AA asks for, but to a dichromat, or to anyone reading a
 * dim tablet from across the room, they are five shades of one grey. Colour was
 * always the secondary channel in this system; five tones simply makes that
 * arithmetic impossible to ignore.
 */
export type Tone = "ok" | "warn" | "bad" | "info" | "neutral";
export type EdgeColor = "orange" | "teal" | "gold" | "green" | "plum" | "blue";

/**
 * How big a control is PAINTED. Added in 1.5.0.
 *
 * `md` (--control-height, 32px) is the system's density and the default
 * everywhere; `sm` (28px) is the compact button/chip. `tap` raises the painted
 * box to --tap-target (44px) for a screen a finger actually uses — a kiosk, a
 * wall tablet, a shift-change board.
 *
 * It is a PER-CONTROL opt-in on purpose. The alternative a consumer reached for
 * first was raising --control-height, which resizes every control in every E911
 * app to serve one screen. The alternative after that was `className="h-tap"`,
 * which works on a bare <input> and silently does not on any component whose
 * className lands on a wrapper — DateField drew a 44px box around a 32px input
 * and nothing said so. One name, on every control in the family, is the version
 * that can't be half-applied: a form set to `tap` is coherent at 44px.
 *
 * Not every control offers all three — Button is sm/md/tap, Chip is sm/tap, and
 * the field controls are md/tap. Each narrows this union rather than inventing
 * its own strings, so `size` means the same thing wherever it appears.
 */
export type ControlSize = "sm" | "md" | "tap";

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
