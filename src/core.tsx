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
 * Button's size union: every ControlSize, plus the one tier only a Button offers.
 *
 * DECLARED HERE RATHER THAN BY WIDENING ControlSize ITSELF, and that choice is
 * the whole blast radius of the kiosk tier. ControlSize is the contract six
 * components share, so a fourth member would oblige Chip, Select, DateField,
 * FormField, Checkbox and Radio to answer for a value none of them has a design
 * for — a 64px checkbox is a tile, a 64px Select trigger is a panel, and each
 * would have to invent something or throw. Those components already NARROW the
 * shared union (`Extract<ControlSize, "md" | "tap">`); this is the same move in
 * the other direction, and it keeps `size` meaning one thing wherever it
 * appears rather than meaning "whatever this component happened to implement".
 *
 * `kiosk` graduates into ControlSize itself when a second and third component
 * genuinely need it — a kiosk filter row, a keypad that becomes a component
 * here — on the same evidence test --font-size-glance had to pass in 1.8.0.
 * One consumer is a Button prop; three is a family.
 */
export type ButtonSize = ControlSize | "kiosk";

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
 * `kiosk` (1.11.0) IS THE ONE ROW WHERE TYPE DOES FOLLOW SIZE, and the sentence
 * above is why it took a new name instead of a fourth height. It is
 * --kiosk-target (64px) AND --font-size-kiosk (18px) together, because the
 * surface it describes is not "a finger instead of a mouse" but "a screen on a
 * wall that a standing dispatcher reads and presses". Keyed to ButtonSize, so
 * every other component's `CONTROL_HEIGHT[size]` still type-checks against the
 * narrower unions they declare. See ButtonSize.
 *
 * SPELLED AS A var() REFERENCE, NOT AS A NAMED `h-ctl-kiosk`, and that is a
 * decision rather than a shortcut. A named utility has to be declared TWICE —
 * once in tokens/tailwind-v4.css and once in tokens/tailwind.preset.js — and a
 * metric that resolves in one port and silently drops in the other is this
 * package's oldest failure shape; it is the argument that decided the
 * pointer-coarse block at the end of tokens.css. A bracketed var() is read
 * identically by both ports with no mapping at all. It is also not what the
 * anti-pattern list bans: what is banned is `h-[64px]`, a number with no token
 * behind it. The token stays the single source of truth here — only the route
 * to it is shorter. Naming the two utilities is a tidy-up in the two mapping
 * files whenever someone is in them, and changes nothing that renders.
 *
 * THE PIXELS BELOW ARE THE DESK ONES, for everything except `kiosk`. As of
 * 1.10.0 --control-height and --control-height-sm are raised under
 * `@media (pointer: coarse)`, so on a wall tablet `md` is 44px and `sm` is 36px
 * and `md` and `tap` paint the same box. That is deliberate — see the block at
 * the end of tokens.css for the argument — but it means this table is a map of
 * NAMES to tokens, not of names to numbers, and anyone reading "32px" off it
 * while debugging a tablet screenshot is reading the wrong device's value.
 * `tap` still exists on a coarse pointer because it is the size a consumer asks
 * for EXPLICITLY when a control is the primary finger target on a desk machine
 * too — a kiosk on a touchscreen PC. `kiosk` is the row that does not move:
 * 64px at both pointer types, on purpose, so the size a reviewer sees on a desk
 * machine is the size the dispatcher gets.
 */
export const CONTROL_HEIGHT: Record<ButtonSize, string> = {
  sm: "h-ctl-sm",
  md: "h-ctl",
  tap: "h-tap",
  kiosk: "h-[var(--kiosk-target)]",
};

/**
 * The same heights as a FLOOR rather than a fixed box, for the one case that
 * has to be able to grow: a button whose label wraps (see `wrap` below).
 *
 * Not a general-purpose alternative to CONTROL_HEIGHT. Every other control in
 * the system holds a single line by construction — an input, a Select trigger,
 * a calendar cell — and a fixed height is what keeps a row of them on one
 * baseline. Only a Button gets handed arbitrary prose by a consumer.
 *
 * THE `kiosk` ROW IS REACHABLE ONLY VIA `wrap`, WHICH IS WHY THAT PROP DOES NOT
 * DEFAULT TRUE THERE. `min-h-[var(--kiosk-target)]` is emitted after `min-h-16`
 * and `min-h-20` in the generated sheet — measured at 9599 against 9416 and
 * 9477 in a build of this package's own tokens — so it OUTRANKS the `min-h-*`
 * that a consuming kiosk uses as its one working height override, and a hero
 * button asking for 80px would silently get 64. A consumer opting a control
 * into this tier must drop its own `min-h-*` in the same edit; `wrap` staying
 * false by default is what keeps that from happening by accident.
 */
const CONTROL_MIN_HEIGHT: Record<ButtonSize, string> = {
  sm: "min-h-ctl-sm",
  md: "min-h-ctl",
  tap: "min-h-tap",
  kiosk: "min-h-[var(--kiosk-target)]",
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
   *
   * `kiosk` (1.11.0) is --kiosk-target tall (64px) with --font-size-kiosk type
   * (18px), in BOTH pointer contexts, for a control on a screen bolted to a
   * wall. Button is the only component that offers it — see ButtonSize.
   *
   * IT EXISTS BECAUSE THE className ESCAPE HATCH FOR TYPE IS CLOSED, AND THE
   * NEXT PERSON HERE WILL BE TEMPTED TO REOPEN IT. Do not. 1.10.0 moved this
   * component from `text-body` to `text-control` for a good reason, and
   * `.text-control` is emitted AFTER every `.text-[Npx]` in the generated sheet
   * at the same specificity — on a clean 1.10.1 build, `.text-body` 27735,
   * `.text-[18px]` 28819, `.text-control` 28981 — so every arbitrary font size
   * a caller had put on a Button went dead in one release, with no error and no
   * warning. The consuming kiosk lost four of them, including "Touch to punch",
   * which asked for 18px and rendered 13px on a desk and 16px on the tablet.
   *
   * The fix is NOT to make the caller's literal win again. An app forbidden to
   * style locally is forbidden precisely so that type is this package's
   * decision, and a system whose sizes can be overridden by whoever happens to
   * sort later is not a system, it is a race — one this package would have to
   * re-run every time a token is renamed. The fix is that the size a kiosk
   * needs is now a size it can ASK FOR.
   */
  size?: ButtonSize;
  /**
   * Let a long label wrap onto a second line instead of pushing the page
   * sideways. Defaults to `true` at `tap`, and `false` at `sm`/`md`/`kiosk`.
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
   *
   * `kiosk` KEEPS NOWRAP TOO, WHICH LOOKS BACKWARDS AND IS MEASURED. `wrap` is
   * about label length against column width, not about size: `tap` is asked for
   * by ordinary app screens where a consumer hands a Button arbitrary prose in a
   * narrow column, and a kiosk label is a few words by construction because it
   * is read from across a room. Measured in the real faces at 1024x768, the
   * longest label on that screen — "Start break" — is 97.4px inside the
   * tightest box it has, a 222px action-grid cell. Nothing there is close to
   * wrapping. The cost of defaulting it true is not hypothetical: it swaps the
   * fixed height for a `min-height`, which is the same property the consuming
   * kiosk uses as its only working height override, and this package's
   * `min-h-[var(--kiosk-target)]` sorts after the app's `min-h-20` — so a hero
   * asking for 80px would quietly become 64. Pass `wrap` explicitly for a
   * genuinely long kiosk label and drop the app-side `min-h-*` when you do.
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
/**
 * Padding and type, one row per size. A table rather than the nested ternary
 * this was through 1.10.x: four arms is where that stopped being readable, and
 * the invariant it has to protect is one a table shows and a ternary hides —
 * EXACTLY ONE FONT SIZE PER ROW, always. Two font-size utilities on one element
 * are decided by Tailwind's emit order rather than by ours, which is precisely
 * the bug this tier was minted to answer; `text-ui-sm` happens to sort after
 * `text-control` today and a theme-key rename would flip it with nothing
 * failing anywhere.
 *
 * `sm` is the one row that steps the type down, which it did before 1.5.0 too —
 * `text-ui-sm` is the small-UI tier and deliberately does not move on a touch
 * device either. `md`/`tap` take `text-control` (1.10.0): a Button's label is
 * text inside a control, and --font-size-control is the token for that, which
 * is also the one token that rises to 16px under `@media (pointer: coarse)`. On
 * `text-body` the Button was the one member of the control family the touch
 * bump could not reach — measured on a wall tablet, a Select trigger at 16px
 * and the Button beside it at 13.5px. Desk machines lose half a pixel on a
 * button label and gain a control family that agrees.
 *
 * `kiosk` KEEPS `tap`'s px-4. A fourth padding step would need an argument from
 * a measurement and there isn't one: almost every control on a kiosk is
 * `w-full`, so horizontal padding only sets the minimum width of the two that
 * shrink to fit — Cancel, and a keypad digit — and 16px on a 64px-tall box is
 * already more than the px-3.5 those two render with today.
 */
const buttonSize: Record<ButtonSize, string> = {
  sm: "px-2.5 text-ui-sm",
  md: "px-3.5 text-control",
  tap: "px-4 text-control",
  kiosk: "px-4 text-[length:var(--font-size-kiosk)]",
};

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
        // and the type comes from the same row so a size cannot be half-applied.
        // See buttonSize — one font size per row is the rule it protects.
        buttonSize[size],
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
