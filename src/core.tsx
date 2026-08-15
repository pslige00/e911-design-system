import * as React from "react";

/* ---------------------------------------------------------------- utils -- */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

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
  danger: "bg-bad text-white font-semibold hover:brightness-95",
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
