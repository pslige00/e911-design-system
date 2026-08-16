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
 */
export const CONTROL_HEIGHT: Record<ControlSize, string> = {
  sm: "h-ctl-sm",
  md: "h-ctl",
  tap: "h-tap",
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
  ({ variant = "primary", size = "md", className, type, ...rest }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
        "rounded-sm text-body transition duration-fast ease-e911",
        buttonDisabled,
        CONTROL_HEIGHT[size],
        // Padding follows the height so the label keeps its optical margins;
        // only `sm` also steps the type down, which it did before 1.5.0 too.
        size === "sm" ? "px-2.5 text-ui-sm" : size === "tap" ? "px-4" : "px-3.5",
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
        "inline-flex items-center gap-1.5 h-[21px] px-2 rounded-pill",
        "text-tag font-semibold",
        tagTone[tone],
        className
      )}
      {...rest}
    >
      <i aria-hidden className="size-[5px] rounded-pill bg-current" />
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
}

/**
 * A cert chip is a code, not a status pill: it has no dot and no tone word, so
 * the fill is the only thing colour says here. That is why only the tones that
 * are asking to be READ get one — `ok` and `neutral` stay a plain outline,
 * because a certification that is simply current does not need to compete with
 * the one expiring in 21 days sitting next to it. Fill every tone and the row
 * goes back to being uniformly loud, which is what the outline is protecting.
 */
const certTone: Record<Tone, string> = {
  neutral: "border-line text-muted",
  ok: "border-line text-muted",
  warn: "border-warn bg-warn-soft text-warn",
  bad: "border-bad bg-bad-soft text-bad",
  info: "border-info bg-info-soft text-info",
};

/** Mono chip for certification codes / IDs. */
export function CertChip({ tone = "neutral", children, className, ...rest }: CertChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center h-5 px-1.5 rounded-[6px] border-chip",
        "font-mono text-badge tabular-nums",
        certTone[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
