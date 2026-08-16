"use client";

import * as React from "react";

// The data half of the system lives in contract.ts, which has no "use client".
// Re-exported here so existing imports from "./core" keep working — but note
// that a re-export through this module is still a client re-export. Server
// components must import from the package root (which points at contract.ts)
// or from "./contract" directly. See the comment in contract.ts.
export { cn, DOMAIN_EDGE } from "./contract";
export type { Tone, EdgeColor } from "./contract";

import { cn, type EdgeColor, type Tone } from "./contract";

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
  size?: "md" | "sm";
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

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, type, ...rest }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
        "rounded-sm text-body transition duration-fast ease-e911",
        "disabled:opacity-45 disabled:cursor-not-allowed",
        size === "md" ? "h-ctl px-3.5" : "h-ctl-sm px-2.5 text-[12px]",
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
}

/** Filter chip. Active = brand-soft fill + brand text (never a status color). */
export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ active = false, className, type, ...rest }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-pressed={active}
      className={cn(
        "h-ctl-sm px-3 rounded-sm border-chip text-[12px] transition duration-fast ease-e911",
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

const tagTone: Record<Tone, string> = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
};

export function StatusTag({ tone, children, className, ...rest }: StatusTagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 h-[21px] px-2 rounded-pill",
        "text-[11px] font-semibold",
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
  tone?: Tone | "neutral";
  children: React.ReactNode; // e.g. "EMD", "CPR 21d"
}

const certTone: Record<NonNullable<CertChipProps["tone"]>, string> = {
  neutral: "border-line text-muted",
  ok: "border-line text-muted",
  warn: "border-warn bg-warn-soft text-warn",
  bad: "border-bad bg-bad-soft text-bad",
};

/** Mono chip for certification codes / IDs. */
export function CertChip({ tone = "neutral", children, className, ...rest }: CertChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center h-5 px-1.5 rounded-[6px] border-chip",
        "font-mono text-[10px] tabular-nums",
        certTone[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
