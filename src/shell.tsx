"use client";

import * as React from "react";
import { cn, isFocusVisible } from "./core";
import { RAIL_PIN_LABEL } from "./contract";

/* --------------------------------------------------------------- AppShell */

/**
 * Hover INTENT, not animation timing — which is why these are plain constants
 * and not motion tokens. A pointer travelling diagonally from the page header to
 * a table cell clips the rail for ~50ms; without the open delay the rail lunges
 * out at it every time. The close delay is the longer of the two so that
 * overshooting the rail's right edge by a few pixels on the way to a menu item
 * doesn't slam it shut mid-reach.
 */
const EXPAND_DELAY_MS = 180;
const COLLAPSE_DELAY_MS = 260;

export interface RailItem {
  id: string;
  /** Accessible name, and the text shown beside the icon once the rail opens. */
  label: string;
  icon: React.ReactNode; // 16×16 stroke icon
  href?: string;
}

/**
 * Renders one rail destination. Supplied by the app so a router-aware link
 * (Next's <Link>, react-router's <NavLink>) can own navigation; without it an
 * `href` item falls back to a plain <a>. The rail is the app's primary nav, so
 * these must be real links — a <button> breaks middle-click, copy-link, and
 * prefetch, and makes every destination invisible to the router.
 *
 * NOTE: no `title`. Until 1.3.0 the rail passed one, which is where SKILL.md's
 * "tooltips on hover" promise actually landed: a `title` is not a tooltip — it
 * never appears on touch, never appears on focus, cannot be styled, and is
 * announced inconsistently on top of the aria-label it duplicates. The rail now
 * reveals a real label instead. Spreading these props onto a link is unaffected.
 */
export type RailLinkRenderer = (props: {
  href: string;
  className: string;
  children: React.ReactNode;
  "aria-label": string;
  "aria-current": "page" | undefined;
}) => React.ReactNode;

export interface AppShellProps {
  items: RailItem[];
  activeId: string;
  /** Called for items with no `href`. Items WITH an href navigate instead. */
  onNavigate?: (id: string) => void;
  /** Router-aware link component for items carrying an `href`. */
  renderLink?: RailLinkRenderer;
  /**
   * Destinations parked at the foot of the rail — a different audience from the
   * main run (Admin, say). Rendered exactly like `items`, which is the point:
   * before this existed, apps hand-copied the rail item's class string into
   * `railFooter` and it went stale the first time the rail changed.
   */
  footerItems?: RailItem[];
  /** Footer slot for controls that are not destinations — theme, avatar. Use
   *  <RailAction> inside it so they inherit the rail's alignment and labels. */
  railFooter?: React.ReactNode;
  /** Controlled pin state. Pair with `onRailPinnedChange` to persist it. */
  railPinned?: boolean;
  /** Uncontrolled initial pin state. Unpinned, so the rail costs 64px until
   *  someone asks for more. */
  defaultRailPinned?: boolean;
  onRailPinnedChange?: (pinned: boolean) => void;
  children: React.ReactNode;
}

/**
 * One class string for every row in the rail — destinations, footer
 * destinations, and the pin — so the three cannot drift apart.
 *
 * `h-tap` rather than the old 40px square: this is a wall-tablet control and
 * --tap-target is the floor. The icon keeps its own 44px box (see RailIcon) so
 * the glyph sits at the same x whether the rail is 64px or open — expanding must
 * reveal labels, never slide the icons.
 */
function railRowClass(active: boolean): string {
  return cn(
    // `min-w-tap` is not belt-and-braces with `w-full`: the rail's 1px right
    // border comes out of its border-box, so a collapsed row's `w-full` resolves
    // to 43px and the touch target lands a pixel under the floor. The floor is
    // the point of the row being this size at all.
    "flex h-tap w-full min-w-tap shrink-0 items-center gap-2 rounded-sm text-body",
    "transition duration-fast ease-e911",
    active
      ? "bg-brand-soft font-semibold text-brand-text"
      : // --text-secondary, not the tertiary the icons used to be: the label is
        // TEXT and owes 4.5:1, and icon + label reading as one control means one
        // colour for both. See the "Rail item" rows in the contrast audit.
        "font-medium text-muted hover:bg-tint hover:text-ink"
  );
}

/** The fixed-width leading box that keeps every glyph on the same vertical line. */
function RailIcon({ children }: { children: React.ReactNode }) {
  return <span className="grid size-tap shrink-0 place-items-center">{children}</span>;
}

function RailLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      // Opacity, not `hidden` or a width animation: the label must keep its box
      // so the rail's width has something to reveal, and it must actually be
      // transparent rather than merely clipped — at 64px the nav's right padding
      // leaves a sliver of the first glyph inside the overflow, which reads as a
      // rendering fault. The fallback of 1 keeps a stray <RailAction> outside
      // the rail legible. Reduced motion is handled globally by tokens.css.
      className={cn(
        "min-w-0 truncate opacity-[var(--rail-label-opacity,1)]",
        "transition-opacity duration-base ease-e911"
      )}
    >
      {children}
    </span>
  );
}

export interface RailActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  /** Accessible name and visible label. Keep it constant across toggle states —
   *  `aria-pressed` carries the state, and changing both says it twice. */
  label: string;
  active?: boolean;
}

/**
 * A rail-shaped button for controls that are not destinations. Exported because
 * `railFooter` used to force apps to re-implement the rail item themselves —
 * icon alignment, hover colours, and now the label reveal too.
 */
export const RailAction = React.forwardRef<HTMLButtonElement, RailActionProps>(
  ({ icon, label, active = false, className, type, ...rest }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      className={cn(railRowClass(active), className)}
      {...rest}
    >
      <RailIcon>{icon}</RailIcon>
      <RailLabel>{label}</RailLabel>
    </button>
  )
);
RailAction.displayName = "RailAction";

/** Lucide's `pin` geometry at lucide's own 24-viewBox and stroke width, because
 *  every other icon in the rail arrives from the app as a 16px lucide glyph and
 *  a hand-drawn 16-viewBox pin at the system's usual 1.6 stroke reads heavier
 *  than its neighbours at exactly the size they sit side by side. */
function PinIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </svg>
  );
}

/**
 * The Terrazzo shell: a 64px icon rail that can show its labels, over the
 * dot-grid canvas. Wrap once per app; put the Ribbon + page content in children.
 *
 * Three ways to read a label, because this runs on desk machines, on wall
 * tablets, and by keyboard:
 *
 *  · **hover**, after a delay, as an OVERLAY. It must not take layout width:
 *    a rail that pushes the page sideways makes every screen jump when a pointer
 *    crosses it on the way somewhere else, which on a wall tablet is worse than
 *    the unlabelled icons were.
 *  · **keyboard focus**, immediately — a delay on a control the operator has
 *    already committed to reads as the rail being broken. `:focus-visible` only,
 *    so clicking a destination doesn't leave the rail hanging open over the page
 *    it just navigated to.
 *  · **the pin**, which is the only one of the three that exists on a
 *    touchscreen, and the only one that takes real layout width. That is what
 *    pinning means: hover is a peek, a pin is a decision.
 */
export function AppShell({
  items,
  activeId,
  onNavigate,
  renderLink,
  footerItems,
  railFooter,
  railPinned,
  defaultRailPinned = false,
  onRailPinnedChange,
  children,
}: AppShellProps) {
  const [selfPinned, setSelfPinned] = React.useState(defaultRailPinned);
  const pinned = railPinned ?? selfPinned;

  const [hoverOpen, setHoverOpen] = React.useState(false);
  const [focusOpen, setFocusOpen] = React.useState(false);
  const open = pinned || hoverOpen || focusOpen;

  const timer = React.useRef(0);
  const clearHoverTimer = React.useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = 0;
  }, []);
  // A rail unmounted mid-delay (route group change, sign-out) would otherwise
  // set state on a dead component.
  React.useEffect(() => clearHoverTimer, [clearHoverTimer]);

  const scheduleHover = (next: boolean, ms: number) => {
    clearHoverTimer();
    timer.current = window.setTimeout(() => setHoverOpen(next), ms);
  };

  const togglePin = () => {
    const next = !pinned;
    // Uncontrolled unless the app passes `railPinned`. Writing local state while
    // a controlled value is present lets the two disagree the moment the app
    // declines the change.
    if (railPinned === undefined) setSelfPinned(next);
    onRailPinnedChange?.(next);
  };

  const renderRow = (it: RailItem) => {
    const active = it.id === activeId;
    const className = railRowClass(active);
    const body = (
      <>
        <RailIcon>{it.icon}</RailIcon>
        <RailLabel>{it.label}</RailLabel>
      </>
    );
    const shared = {
      "aria-label": it.label,
      "aria-current": active ? ("page" as const) : undefined,
    };

    if (it.href) {
      return (
        <React.Fragment key={it.id}>
          {renderLink
            ? renderLink({ href: it.href, className, children: body, ...shared })
            : // No router supplied — a plain anchor still navigates correctly,
              // it just costs a full page load.
              <a href={it.href} className={className} {...shared}>
                {body}
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
        {body}
      </button>
    );
  };

  return (
    <div
      className={cn(
        "e911-app grid min-h-screen max-md:grid-cols-1",
        // The TRACK is what decides whether the rail is overlaying or occupying.
        // It follows `pinned`, never `open` — that one word is the whole
        // no-reflow-on-hover contract.
        pinned ? "grid-cols-[var(--rail-width-expanded)_1fr]" : "grid-cols-[var(--rail-width)_1fr]",
        "transition-[grid-template-columns] duration-base ease-e911"
      )}
    >
      <nav
        aria-label="Primary"
        data-expanded={open ? "true" : "false"}
        data-pinned={pinned ? "true" : "false"}
        // A state flag, not a style decision: RailLabel reads it, and putting it
        // on the nav is what lets a <RailAction> the APP renders inside
        // `railFooter` fade in step with the rest of the rail.
        style={{ "--rail-label-opacity": open ? 1 : 0 } as React.CSSProperties}
        onPointerEnter={(e) => {
          // Touch has no hover, and a tap that expands the rail would cover the
          // page the tap just navigated to, with no pointerleave ever coming to
          // put it back. On a touchscreen the pin is the whole mechanism.
          if (e.pointerType === "touch") return;
          scheduleHover(true, EXPAND_DELAY_MS);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "touch") return;
          scheduleHover(false, COLLAPSE_DELAY_MS);
        }}
        onFocus={(e) => {
          if (isFocusVisible(e.target)) setFocusOpen(true);
        }}
        onBlur={(e) => {
          // relatedTarget is where focus went. Moving between two rail items
          // must not flicker the rail shut and open again.
          if (!e.currentTarget.contains(e.relatedTarget)) setFocusOpen(false);
        }}
        className={cn(
          "relative z-rail flex flex-col gap-1.5 overflow-hidden",
          "border-r border-line bg-card px-2.5 py-3.5 max-md:hidden",
          "transition-[width] duration-base ease-e911",
          open ? "w-rail-expanded" : "w-rail",
          // Lift it off the page only while it is genuinely floating over the
          // page; a pinned rail is part of the layout and a shadow would make it
          // look permanently detached.
          open && !pinned ? "shadow-pop" : null
        )}
      >
        <div className="flex h-tap w-full shrink-0 items-center">
          <RailIcon>
            <span
              aria-hidden
              className="grid size-[30px] place-items-center rounded-pill bg-brand text-[9px] font-extrabold text-white"
            >
              911
            </span>
          </RailIcon>
        </div>

        {/* First in tab order on purpose: one Tab into the page opens the rail
            and shows a keyboard operator every destination at once, and it puts
            the only affordance a touch user has where they will look for it. */}
        <RailAction
          icon={<PinIcon />}
          label={RAIL_PIN_LABEL}
          active={pinned}
          aria-pressed={pinned}
          onClick={togglePin}
        />
        <div aria-hidden className="h-px w-full shrink-0 bg-line" />

        {items.map(renderRow)}

        {footerItems?.length || railFooter ? (
          <div className="mt-auto flex w-full flex-col gap-1.5 pt-1.5">
            {footerItems?.map(renderRow)}
            {railFooter}
          </div>
        ) : null}
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
          ? // The pill and its label are ONE token pair. This read `bg-white
            // text-brand-text`, and --text-brand flips to a light orange in dark
            // mode while the pill stayed white — 2.01:1, the worst ratio in the
            // system. Whatever repaints the pill must repaint the label with it.
            "bg-[var(--ribbon-action-surface)] font-bold text-[var(--ribbon-action-text)] hover:brightness-95"
          : // The scrim is load-bearing, not decoration: this button is the only
            // ribbon text that is right-aligned, so it is the only one that lands
            // on the gradient's gold terminus, where plain --ribbon-text is
            // 2.62:1. Delete the bg and it fails AA on every page that has one.
            "border border-white/50 bg-[var(--ribbon-ghost-scrim)] font-semibold text-[var(--ribbon-text)] " +
            "hover:bg-[var(--ribbon-ghost-scrim-hover)]",
        className
      )}
      {...rest}
    />
  );
}
