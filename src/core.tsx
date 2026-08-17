"use client";

import * as React from "react";

// The data half of the system lives in contract.ts, which has no "use client".
// Re-exported here so existing imports from "./core" keep working — but note
// that a re-export through this module is still a client re-export. Server
// components must import from the package root (which points at contract.ts)
// or from "./contract" directly. See the comment in contract.ts.
export { cn, DOMAIN_EDGE } from "./contract";
export type { Tone, EdgeColor, ControlSize } from "./contract";

import { cn, type ControlSize, type EdgeColor, type Tone } from "./contract";

/* ---------------------------------------------------------- control sizes */
/**
 * The painted height of every control in the system, in one place, because five
 * components offer `size` and a form is only coherent if they agree. Height
 * only: horizontal padding belongs to the control (a Button is padded for a
 * label, an input for a caret), and the type scale does NOT follow size — a
 * 44px field is the same 13px text, since `tap` is about what a finger can hit,
 * not about what an eye can read.
 *
 * `tap` is --tap-target, the same 44px floor the rail rows and the calendar
 * cells already use, so a tap-sized form lines up with the shell around it.
 *
 * THE PIXELS BELOW ARE THE DESK ONES. As of 1.10.0 --control-height and
 * --control-height-sm are raised under `@media (pointer: coarse)`, so on a wall
 * tablet `md` is 44px and `sm` is 36px and `md` and `tap` paint the same box.
 * That is deliberate — see the block at the end of tokens.css for the argument —
 * but it means this table is a map of NAMES to tokens, not of names to numbers,
 * and anyone reading "32px" off it while debugging a tablet screenshot is
 * reading the wrong device's value. `tap` still exists on a coarse pointer
 * because it is the size a consumer asks for EXPLICITLY when a control is the
 * primary finger target on a desk machine too — a kiosk on a touchscreen PC.
 */
export const CONTROL_HEIGHT: Record<ControlSize, string> = {
  sm: "h-ctl-sm",
  md: "h-ctl",
  tap: "h-tap",
};

/**
 * The same three heights as a FLOOR rather than a fixed box, for the one case
 * that has to be able to grow: a button whose label wraps (see `wrap` below).
 *
 * Not a general-purpose alternative to CONTROL_HEIGHT. Every other control in
 * the system holds a single line by construction — an input, a Select trigger,
 * a calendar cell — and a fixed height is what keeps a row of them on one
 * baseline. Only a Button gets handed arbitrary prose by a consumer.
 */
const CONTROL_MIN_HEIGHT: Record<ControlSize, string> = {
  sm: "min-h-ctl-sm",
  md: "min-h-ctl",
  tap: "min-h-tap",
};

/* ------------------------------------------------------------- focus util */
/**
 * Shared by every component that reveals something on focus (Tooltip, the rail).
 * The distinction matters: a plain `onFocus` fires when a POINTER clicks a
 * control too, so keying off it leaves a tooltip hanging over the page you just
 * navigated to, and leaves the rail expanded over the content you just clicked
 * through to. `:focus-visible` is the browser's own answer to "did a keyboard
 * put focus here", and it is the only one that stays right across pointer types.
 */
export function isFocusVisible(el: Element): boolean {
  try {
    return el.matches(":focus-visible");
  } catch {
    // Very old engines don't know the selector; showing the label is the safer
    // failure than never showing it to a keyboard user.
    return true;
  }
}

/* ----------------------------------------------------------------- Button */
type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /**
   * `sm`/`md` unchanged; `tap` (1.5.0) paints the button at --tap-target for a
   * kiosk or wall-tablet screen. Consumers were reaching this with
   * `className="min-h-tap"`, which works on a Button and does not work on any
   * control whose className lands on a wrapper — so the name is the system's
   * now. See ControlSize.
   */
  size?: ControlSize;
  /**
   * Let a long label wrap onto a second line instead of pushing the page
   * sideways. Defaults to `true` at `tap` and `false` at `sm`/`md`.
   *
   * THIS PROP EXISTS BECAUSE THE CLASSNAME ESCAPE HATCH DOES NOT WORK HERE, and
   * that is not obvious from the outside. `whitespace-nowrap` is in this
   * component's own class string, and a caller passing `whitespace-normal`,
   * `text-wrap`, `whitespace-pre-line` or even the arbitrary
   * `[white-space:normal]` loses every time — all of them are core-tier
   * utilities and `nowrap` sorts later, so the button stays on one line and
   * overflows its column with no warning. Measured at 332.8px in a 180px column
   * on a 41-character label: 152.8px of overflow, unfixable from the call site.
   *
   * `tap` defaults to wrapping because that size exists for phones, kiosks and
   * wall tablets, which is where a column narrow enough to matter actually
   * occurs; a single-line label is unaffected, since the min-height and the old
   * fixed height are the same 44px. `sm`/`md` keep nowrap because a desk-density
   * button that silently grows to two lines breaks the row it sits in — there
   * the consumer knows the label and asks for wrapping deliberately.
   */
  wrap?: boolean;
}

const buttonVariant: Record<ButtonVariant, string> = {
  primary: "bg-action text-action-fg font-semibold hover:bg-action-hover",
  secondary:
    "border border-line-strong bg-card text-ink font-medium hover:bg-tint",
  quiet: "text-muted font-medium hover:bg-tint hover:text-ink",
  // text-bad-fg, not text-white: --status-bad inverts between themes (dark red
  // in light, light salmon in dark), so one fixed white label measured 2.95:1 in
  // dark — the destructive action was the least readable button in the system.
  danger: "bg-bad text-bad-fg font-semibold hover:brightness-95",
};

/**
 * One disabled treatment for all four variants (1.7.0). Before it, Button,
 * Select and DateField each reached for `opacity-45` independently. They agreed
 * only by coincidence, and nothing in the system would have noticed if one of
 * them stopped — that is the drift the disabled tokens exist to end.
 *
 * Opacity was also the wrong instrument: it fades the LABEL as hard as the fill.
 * WCAG 1.4.3 exempts a disabled control from the contrast floor, but a
 * dispatcher still has to read WHICH action is unavailable to know what to do
 * instead — Approve greyed out and Reject greyed out are not the same screen.
 * --text-disabled is measured for that: 3.38:1 on card in light, 3.27:1 in dark.
 *
 * `disabled:border-line-disabled` is inert on the three variants that paint no
 * border, and load-bearing on `secondary`, which would otherwise keep
 * --border-strong around a dead control.
 *
 * The `disabled:hover:` half is not redundant. A disabled <button> still matches
 * :hover in Chrome, and `disabled:bg-disabled` ties with the variant's
 * `hover:bg-action-hover` on specificity — the winner would be whichever variant
 * Tailwind emits last, which is not something this file should depend on. The
 * compound variant outranks it outright, so a disabled button does not light up
 * under the pointer.
 */
const buttonDisabled =
  "disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-fg " +
  "disabled:border-line-disabled disabled:hover:bg-disabled " +
  "disabled:hover:text-disabled-fg disabled:hover:brightness-100";

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", wrap = size === "tap", className, type, ...rest }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(
        "inline-flex items-center justify-center gap-1.5",
        "rounded-sm transition duration-fast ease-e911",
        buttonDisabled,
        // A wrapping button needs all three of these together, and each one is
        // load-bearing: the min-height so a second line can grow the box (`h-tap`
        // is a fixed `height` — a wrapped label inside one just overflows it),
        // `text-center` because `justify-center` centres the line box and not the
        // lines within it, and `py-1` so a two-line label is not flush against
        // the border once the min-height stops being the binding constraint.
        wrap
          ? `${CONTROL_MIN_HEIGHT[size]} whitespace-normal text-center py-1`
          : `${CONTROL_HEIGHT[size]} whitespace-nowrap`,
        // Padding follows the height so the label keeps its optical margins,
        // and only `sm` also steps the type down, which it did before 1.5.0 too
        // — it stays on `text-ui-sm`, the small-UI tier, which deliberately does
        // not move on a touch device either. See the end of tokens.css.
        //
        // text-control, NOT text-body (1.10.0). A Button's label is text inside a
        // control, and --font-size-control is the token for that — which is also
        // the one token that rises to 16px under `@media (pointer: coarse)`. On
        // `text-body` the Button was the one member of the control family the
        // touch bump could not reach: measured on a wall tablet, a Select
        // trigger rendered at 16px and the Button beside it at 13.5px, and
        // "Clock in" — the most-pressed control in the building — carried a
        // 13.5px label at arm's length in a dark room. Desk machines lose 0.5px
        // on a button label and gain a control family that agrees.
        //
        // Written into the size branch rather than sitting in the base string
        // beside `text-ui-sm`, because two font-size utilities on one element is
        // decided by Tailwind's emit order, not by ours. `text-ui-sm` happens to
        // sort after `text-control` today; a theme-key rename would flip it and
        // nothing would fail. Exactly one font size per branch, always.
        size === "sm" ? "px-2.5 text-ui-sm" : size === "tap" ? "px-4 text-control" : "px-3.5 text-control",
        buttonVariant[variant],
        className
      )}
      {...rest}
    />
  )
);
Button.displayName = "Button";

/* ------------------------------------------------------------------- Chip */
export interface ChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  /**
   * `sm` (28px) is the filter row's own size and stays the default. `tap` is
   * for a chip row a finger uses — the most-poked control on a wall board is
   * usually a filter, and 28px is well under the floor. See ControlSize.
   */
  size?: Extract<ControlSize, "sm" | "tap">;
}

/** Filter chip. Active = brand-soft fill + brand text (never a status color). */
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ active = false, size = "sm", className, type, ...rest }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-pressed={active}
      className={cn(
        CONTROL_HEIGHT[size],
        size === "tap" ? "px-4" : "px-3",
        "rounded-sm border-chip text-ui-sm transition duration-fast ease-e911",
        active
          ? "border-action bg-brand-soft text-brand-text font-semibold"
          : "border-line bg-card text-muted font-medium hover:text-ink",
        className
      )}
      {...rest}
    />
  )
);
Chip.displayName = "Chip";

/* -------------------------------------------------------------- StatusTag */
export interface StatusTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone: Tone;
  children: React.ReactNode; // the word is REQUIRED: pill + dot + word, never color alone
}

/**
 * Every tone gets a soft fill and its own text colour, and none of them is
 * allowed to be the whole message. All five light-theme text colours sit inside
 * a 0.018 luminance band, so to a dichromat — or to anyone reading a dim wall
 * tablet from across the room — this Record produces five shades of one grey.
 * The dot and the word below are what actually distinguish them; the fill only
 * agrees with the word once it has been read. See Tone in contract.ts.
 */
const tagTone: Record<Tone, string> = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
  neutral: "bg-neutral-soft text-neutral",
};

export function StatusTag({ tone, children, className, ...rest }: StatusTagProps) {
  return (
    <span
      className={cn(
        // `h-tag` and `size-tag-dot` (1.8.0), which were a 21px height and a
        // 5px dot written as arbitrary utilities. Not a tidy-up: SKILL.md publishes this exact shape as a
        // recipe for apps that cannot pass a component into a slot, so both
        // numbers were being copied into app source — the same path 12.5px took
        // before --font-size-ribbon-meta existed. The dot in particular is the
        // non-colour half of pill + dot + word, and a signal an app can only
        // reproduce by transcribing a literal is a signal that will drift.
        "inline-flex items-center gap-1.5 h-tag px-2 rounded-pill",
        "text-tag font-semibold",
        tagTone[tone],
        className
      )}
      {...rest}
    >
      <i aria-hidden className="size-tag-dot rounded-pill bg-current" />
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- CertChip */
export interface CertChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  // Was `Tone | "neutral"` until 1.7.0, when neutral joined Tone itself. Left
  // spelled out, the union would quietly stay a THREE-tone one plus neutral —
  // `info` would never be offered here, and the cert chip would be the one
  // component in the system whose tone means something narrower than Tone.
  tone?: Tone;
  children: React.ReactNode; // e.g. "EMD", "CPR 21d"
  /**
   * The word the tone adds to what a screen reader reads out, since the chip's
   * own text is a code and says nothing about why it is toned. Defaults to the
   * severity word below; pass the specific one where the app knows it
   * ("expired", "adjustment", "superseded"), and pass "" where the visible code
   * already says it — `<CertChip tone="bad">TDD expired</CertChip>` does not
   * need to announce "TDD expired, critical".
   */
  toneLabel?: string;
}

/**
 * A cert chip is a code, not a status pill: it has no dot and no tone word, so
 * the fill is the only thing colour says here. That is why only the tones that
 * are asking to be READ get one — `ok` and `neutral` stay a plain outline,
 * because a certification that is simply current does not need to compete with
 * the one expiring in 21 days sitting next to it. Fill every tone and the row
 * goes back to being uniformly loud, which is what the outline is protecting.
 *
 * THE LEFT RULE IS NOT DECORATION — IT IS THE NON-COLOUR HALF (1.10.0, WCAG
 * 1.4.1 Level A). Until it existed the sentence above was also an admission:
 * hue was the ONLY carrier, and hue is the channel that goes first. Simulating
 * deuteranopia on the real token values, the warn and bad borders converge from
 * ΔRGB 84 to 21 in dark and to 36 in light; the light-theme soft fills are
 * already within Δ13 of each other with normal colour vision, so the fill was
 * carrying almost nothing there even before that. `<CertChip tone="warn">ADJ` on
 * /reports was indistinguishable from an untoned sibling for roughly one man in
 * twelve on the floor.
 *
 * The rule's WEIGHT is the ramp — nothing, 4px, 8px — because thickness is the
 * one difference that still reads at arm's length on a dimmed wall tablet,
 * where a dash pattern or a 2px step does not. `bad` splits its rule in two
 * rather than growing a third time: 16px of bar on a 20px chip would be a
 * fill, and "no longer valid" is a different KIND of thing from "louder", not
 * more of it. The style is set per-side deliberately — `border-double` would
 * take the other three edges with it, and `double` under 3px renders as solid
 * in Chromium and as engine's-choice everywhere else, so the outline would be
 * quietly at the mercy of the browser.
 *
 * Widths survive what colour does not: a greyscale wall tablet, a photocopy,
 * and `forced-colors: active`, which overrides every hue on this element to a
 * system colour and leaves border-width alone.
 */
const certTone: Record<Tone, string> = {
  neutral: "border-line text-muted",
  ok: "border-line text-muted",
  warn: "border-warn bg-warn-soft text-warn border-l-8",
  bad: "border-bad bg-bad-soft text-bad border-l-8 [border-left-style:double]",
  info: "border-info bg-info-soft text-info border-l-4",
};

/**
 * The severity word each tone contributes to the announced text. `null` for the
 * two tones that paint no rule and no fill: they say "routine", and announcing
 * "routine" on every badge number in a table is noise, not access.
 *
 * These are the generic words on purpose. The component knows the tone and only
 * the tone — whether `warn` on this chip means "expiring", "adjusted" or
 * "provisional" is the app's knowledge, which is what `toneLabel` is for.
 */
const certToneLabel: Record<Tone, string | null> = {
  neutral: null,
  ok: null,
  warn: "warning",
  bad: "critical",
  info: "note",
};

/** Mono chip for certification codes / IDs. */
export function CertChip({ tone = "neutral", toneLabel, children, className, ...rest }: CertChipProps) {
  const spoken = toneLabel ?? certToneLabel[tone];
  return (
    <span
      className={cn(
        // `rounded-xs` (1.8.0), not the 6px this drew before it — the last
        // undeclared radius in the package, after 1.7.0 took RibbonButton's 9px.
        // tokens.css widened `xs` from "the Checkbox box" to any painted box
        // 20px or under to make room for it, because the scope was always a
        // stand-in for SMALL and this is the smallest thing here after the box.
        //
        // The two are nearly the same drawing: a 1.5px `border-chip` stroke
        // around a 20px box here, around an 18px box there. Six and five in one
        // form is the squircle-beside-a-circle problem `xs` was minted to end.
        // `sm` was never available — 8px on this height clamps to a stadium,
        // which is StatusTag's shape, and a cert code is not a status.
        //
        // MUST stay in step with the KpiCard delta pill in data.tsx, which is
        // the same badge at the same radius. If one moves and the other does
        // not, two identical pills sit in one card at different corners.
        "inline-flex items-center h-5 px-1.5 rounded-xs border-chip",
        "font-mono text-badge tabular-nums",
        certTone[tone],
        className
      )}
      {...rest}
    >
      {children}
      {/* The other half of 1.4.1, and the half nothing else in this component
          can cover: the left rule is a visual carrier, and a screen reader
          reads no borders. Rendered as text inside the chip rather than as
          `title` or `aria-description` because this span has no role, so it has
          no accessible NAME to hang either of those on — the only thing a
          screen reader will ever say about it is its text content. A leading
          comma, because "EMD 21d warning" is one phrase and "EMD 21d, warning"
          is two.

          `select-none` keeps it out of the CLIPBOARD without keeping it out of
          the accessibility tree: a range that spans this chip serialises to
          "HOLDOVER" again, not "HOLDOVER, warning", so a supervisor quoting a
          badge or an exception code into an incident note pastes the code he
          pointed at. Chromium and Gecko both drop `user-select: none` text from
          a selection and neither drops it from the tree — the AX node is still
          a plain StaticText, which is what a reader announces. Do not reach for
          `aria-label` here instead: this span has no role, so ARIA prohibits it
          and a conforming reader is entitled to say nothing at all. */}
      {spoken ? <span className="sr-only select-none">{`, ${spoken}`}</span> : null}
    </span>
  );
}
