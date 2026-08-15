"use client";

import * as React from "react";
import { cn } from "./core";

/* --------------------------------------------------------------- AppShell */
export interface RailItem {
  id: string;
  label: string; // tooltip + aria-label; the rail shows icons only
  icon: React.ReactNode; // 16×16 stroke icon
  href?: string;
}

/**
 * Renders one rail destination. Supplied by the app so a router-aware link
 * (Next's <Link>, react-router's <NavLink>) can own navigation; without it an
 * `href` item falls back to a plain <a>. The rail is the app's primary nav, so
 * these must be real links — a <button> breaks middle-click, copy-link, and
 * prefetch, and makes every destination invisible to the router.
 */
export type RailLinkRenderer = (props: {
  href: string;
  className: string;
  children: React.ReactNode;
  "aria-label": string;
  "aria-current": "page" | undefined;
  title: string;
}) => React.ReactNode;

export interface AppShellProps {
  items: RailItem[];
  activeId: string;
  /** Called for items with no `href`. Items WITH an href navigate instead. */
  onNavigate?: (id: string) => void;
  /** Router-aware link component for items carrying an `href`. */
  renderLink?: RailLinkRenderer;
  /** Footer slot — user avatar, settings */
  railFooter?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * The Terrazzo shell: 64px icon rail + dot-grid canvas.
 * Wrap once per app; put the Ribbon + page content in children.
 */
export function AppShell({
  items,
  activeId,
  onNavigate,
  renderLink,
  railFooter,
  children,
}: AppShellProps) {
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
          const className = cn(
            "grid size-10 place-items-center rounded-sm transition duration-fast ease-e911",
            active ? "bg-brand-soft text-brand-text" : "text-faint hover:bg-tint hover:text-ink"
          );
          const shared = {
            "aria-label": it.label,
            "aria-current": active ? ("page" as const) : undefined,
            title: it.label,
          };

          if (it.href) {
            const children = it.icon;
            return (
              <React.Fragment key={it.id}>
                {renderLink
                  ? renderLink({ href: it.href, className, children, ...shared })
                  : // No router supplied — a plain anchor still navigates correctly,
                    // it just costs a full page load.
                    <a href={it.href} className={className} {...shared}>
                      {children}
                    </a>}
              </React.Fragment>
            );
          }

          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onNavigate?.(it.id)}
              className={className}
              {...shared}
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
