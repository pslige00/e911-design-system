import * as React from "react";
import { cn } from "./core";

/* --------------------------------------------------------------- AppShell */
export interface RailItem {
  id: string;
  label: string; // tooltip + aria-label; the rail shows icons only
  icon: React.ReactNode; // 16×16 stroke icon
  href?: string;
}

export interface AppShellProps {
  items: RailItem[];
  activeId: string;
  onNavigate?: (id: string) => void;
  /** Footer slot — user avatar, settings */
  railFooter?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The Terrazzo shell: 64px icon rail + dot-grid canvas.
 * Wrap once per app; put the Ribbon + page content in children.
 */
export function AppShell({ items, activeId, onNavigate, railFooter, children }: AppShellProps) {
  return (
    <div className="e911-app grid min-h-screen grid-cols-[var(--rail-width)_1fr] max-md:grid-cols-1">
      <nav
        aria-label="Primary"
        className="flex flex-col items-center gap-1.5 border-r border-line bg-card py-3.5 max-md:hidden"
      >
        <div
          aria-hidden
          className="mb-2.5 grid size-[30px] place-items-center rounded-pill bg-brand text-[9px] font-extrabold text-white"
        >
          911
        </div>
        {items.map((it) => {
          const active = it.id === activeId;
          return (
            <button
              key={it.id}
              type="button"
              aria-label={it.label}
              aria-current={active ? "page" : undefined}
              title={it.label}
              onClick={() => onNavigate?.(it.id)}
              className={cn(
                "grid size-10 place-items-center rounded-sm transition duration-fast ease-e911",
                active
                  ? "bg-brand-soft text-brand-text"
                  : "text-faint hover:bg-tint hover:text-ink"
              )}
            >
              {it.icon}
            </button>
          );
        })}
        {railFooter ? <div className="mt-auto">{railFooter}</div> : null}
      </nav>
      <main className="min-w-0">{children}</main>
    </div>
  );
}

/* ----------------------------------------------------------------- Ribbon */
export interface RibbonProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Right-aligned page actions. White = primary, ghost = secondary. */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * The Solstice ribbon — one per page, always the page header.
 * Children buttons: use <RibbonButton> variants below.
 */
export function Ribbon({ eyebrow, title, subtitle, actions, className }: RibbonProps) {
  return (
    <header
      className={cn(
        "relative m-4 overflow-hidden rounded-lg bg-ribbon p-5",
        "text-[var(--ribbon-text)]",
        className
      )}
    >
      <div
        aria-hidden
        className="absolute -right-[60px] -top-[80px] size-[240px] rounded-pill bg-white/10"
      />
      {eyebrow ? (
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em]">{eyebrow}</div>
      ) : null}
      <h1 className="mt-1 font-display text-[24px] font-bold tracking-[-0.015em]">{title}</h1>
      {subtitle ? <p className="mt-0.5 text-[12.5px] opacity-95">{subtitle}</p> : null}
      {actions ? (
        <div className="absolute right-5 top-1/2 flex -translate-y-1/2 gap-2 max-md:static max-md:mt-3 max-md:translate-y-0">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function RibbonButton({
  variant = "primary",
  className,
  type,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  return (
    <button
      type={type ?? "button"}
      className={cn(
        "h-[33px] rounded-[9px] px-3.5 text-[12.5px] transition duration-fast ease-e911",
        variant === "primary"
          ? "bg-white font-bold text-brand-text hover:bg-white/90"
          : "border border-white/50 font-semibold text-[var(--ribbon-text)] hover:bg-white/10",
        className
      )}
      {...rest}
    />
  );
}
