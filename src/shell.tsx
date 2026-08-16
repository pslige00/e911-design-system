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
  /**
   * `id` of the <main> the skip link jumps to. It is a prop rather than a
   * constant because an app may already have the id wired into a router or an
   * anchor of its own; everything else about the skip link is the shell's.
   */
  mainId?: string;
  /** Skip-link wording, for apps that speak differently. */
  skipLinkLabel?: string;
  /**
   * Opt out of the skip link — only for an app that renders its own BEFORE
   * <AppShell>. Two skip links is a worse first tab stop than one.
   */
  skipLink?: boolean;
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
  mainId = "main-content",
  skipLinkLabel = "Skip to main content",
  skipLink = true,
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

  /* THE DRAWER (1.9.0). Below `md` the rail was `display: none` with nothing in
     its place — no menu button, no tab bar, nothing else in the DOM reaching
     any other route. Every destination, the theme toggle, the pin and sign-out
     were inside that one hidden box, so on a phone this app had no navigation
     at all. It surfaced as "an employee cannot sign out", but sign-out was only
     the first thing anyone happened to need: employees land on /clock, the one
     screen built as the PWA home and therefore the one most likely to be opened
     under 768px. Every other role lands on /now, which nobody had opened on a
     phone because desk machines and wall tablets are the stated primary surface.

     A bottom tab bar was considered and does not fit: this app's roles carry ten
     destinations plus the theme toggle and sign-out, and a tab bar holds four or
     five before it needs an overflow menu — which is this drawer, reached one
     tap later. So the drawer IS the pattern rather than a fallback behind one.

     It reuses the rail's own expanded presentation rather than introducing a
     second navigation vocabulary: same rows, same 44px targets, same labels,
     same focus indicator. Below `md` the nav becomes a fixed panel that slides
     in; above it, nothing about the rail changes. */
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const menuButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const navRef = React.useRef<HTMLElement | null>(null);

  // Escape closes, and focus goes back to the control that opened it — losing
  // focus to <body> is how a keyboard operator ends up tabbing the page behind.
  React.useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Focus into the panel on open. Without this the drawer is visible and the
  // next Tab is still somewhere in the page behind it.
  React.useEffect(() => {
    if (drawerOpen) navRef.current?.focus();
  }, [drawerOpen]);

  /* CLOSE IT WHEN THE VIEWPORT CROSSES BACK ABOVE `md`, and this one is not
     cosmetic. Every other part of the drawer is scoped in CSS by `max-md:`, so
     crossing the breakpoint fixes itself — but `inert` on <main> is React state
     and cannot be. Leave it and a drawer opened below 768px keeps <main> inert
     after the viewport grows: the rail is a normal column again, the drawer is
     gone, and the entire page is unfocusable and invisible to a screen reader
     with nothing on screen explaining why and no control left to undo it.

     A tablet rotating from portrait to landscape is exactly this, and 768px is
     the width a portrait tablet sits at — the likeliest device in this app's
     estate to cross the line with the drawer open, not a contrived case.

     matchMedia rather than a resize handler: it fires on the transition itself
     rather than on every intermediate pixel. The literal 48rem must stay in
     step with Tailwind's `md`; there is no way to read a breakpoint back out of
     a utility, which is the one thing here that could silently drift. */
  React.useEffect(() => {
    if (!drawerOpen) return;
    const mq = window.matchMedia("(min-width: 48rem)");
    if (mq.matches) {
      setDrawerOpen(false);
      return;
    }
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setDrawerOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [drawerOpen]);

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
        // duration-slow, and it MUST stay in lockstep with the nav's own
        // transition-[width] below: pinning moves both across the same 64px ->
        // 224px on the same click, and a track that settles AFTER the rail leaves
        // the rail wider than the column it lives in, overhanging <main> at
        // z-rail for the difference. This ran at --e911-dur (170ms), the duration
        // a chip's colour change uses; over 160px of layout it reads as clipped.
        // tokens.css scopes the slow token by DISTANCE, not importance.
        // Reduced motion is unaffected: tokens.css lists `.e911-app` ITSELF, not
        // merely its descendants, precisely because this transition is on the
        // shell root, and its 0.01ms is !important — which no utility can lose to.
        "transition-[grid-template-columns] duration-slow ease-e911"
      )}
    >
      {/* FIRST in the DOM, and therefore first in tab order — which is the only
          thing that makes a skip link work, and the reason it lives here rather
          than in each app. The rail deliberately puts its pin control first
          INSIDE the rail, so an app-level skip link would have to be rendered
          before <AppShell> to precede it; the shell owns that boundary. */}
      {skipLink ? <SkipLink targetId={mainId} label={skipLinkLabel} /> : null}
      {/* THE MOBILE BAR. Only below `md`, where the rail is a drawer rather than
          a column. It gives the seal a home and the trigger a predictable place;
          a floating button was the alternative and would have overlapped page
          content on the smallest screens this app runs on.

          `h-tap` not a smaller bar: it holds a control, and --tap-target is the
          floor for anything a finger reaches. It is sticky for the same reason
          the rail is — a control that scrolls away is a control you have to
          hunt for, which is the bug one layer up. */}
      <div className="sticky top-0 z-rail flex h-tap shrink-0 items-center justify-between border-b border-line bg-card px-2.5 md:hidden">
        <span
          aria-hidden
          className="grid size-[30px] place-items-center rounded-pill bg-brand text-seal font-extrabold text-white"
        >
          911
        </span>
        <button
          ref={menuButtonRef}
          type="button"
          // aria-expanded is the state; the label stays constant across it, the
          // same rule the rail's pin follows. Saying "Open"/"Close" as well
          // announces the state twice and inverts it for anyone hearing one.
          aria-label="Navigation"
          aria-expanded={drawerOpen}
          aria-controls={`${mainId}-rail`}
          onClick={() => setDrawerOpen((v) => !v)}
          className="grid size-tap place-items-center rounded-sm text-muted hover:bg-tint hover:text-ink"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {drawerOpen ? (
              <>
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </>
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </div>
      {/* Backdrop. Tapping outside a drawer to dismiss it is the gesture people
          try first, and without it the only way out is the X — which is exactly
          the "no emergency exit" complaint. z-rail so it covers the page but
          sits under the panel itself. */}
      {drawerOpen ? (
        <div
          aria-hidden
          onClick={() => setDrawerOpen(false)}
          // The SAME expression Dialog's overlay uses, deliberately — one scrim
          // in the system, not two that drift.
          //
          // It is spelled as a whole colour rather than as an opacity modifier
          // because `bg-[var(--token)]/50` COMPILES TO NOTHING: Tailwind cannot
          // apply an opacity modifier to an arbitrary var(). The first draft of
          // this line was exactly that, and it emitted no rule at all — a fully
          // transparent backdrop that still swallowed every tap, which reads as
          // a dead page rather than as a missing colour. Caught by grepping the
          // compiled CSS for the rule, which is the only thing that would have.
          className="fixed inset-0 z-rail bg-[color-mix(in_srgb,var(--surface-canvas)_80%,transparent)] md:hidden"
        />
      ) : null}
      <nav
        id={`${mainId}-rail`}
        ref={navRef}
        // -1 so the panel itself can take focus when the drawer opens. It is not
        // a tab stop otherwise.
        tabIndex={-1}
        // A tap on any destination navigates, and a drawer still covering the
        // page it just navigated to is the thing that makes people think the tap
        // failed. Delegated rather than wired into renderRow because the row may
        // be an app-supplied <Link>, and this must not depend on which.
        onClick={(e) => {
          if (drawerOpen && (e.target as HTMLElement).closest("a,button")) {
            setDrawerOpen(false);
          }
        }}
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
          // STICKY, AND BOUNDED TO THE VIEWPORT (1.8.2). Reported from the
          // field: Admin and the theme toggle "can't be reached without
          // scrolling to the bottom of the page".
          //
          // The rail was never pinned to anything. It is a grid item beside
          // <main>, and a grid item's default `align-self: stretch` sizes it to
          // the ROW, which is as tall as the tallest cell — <main>. Measured on
          // /now at 1280x640 before this change: main.scrollHeight 5156px, and
          // nav's own rect 5156.47px. The rail was not overflowing; it was
          // being told to be five thousand pixels tall, and `mt-auto` dutifully
          // put the footer at the bottom of THAT box. The sign-out button sat
          // 4516px below the fold. On this app's page inventory — schedule
          // grids, approval queues, reports — that is nearly every screen, so
          // the rail was not functioning as a rail on any of them.
          //
          // `h-dvh` not `h-screen`: dvh tracks the dynamic viewport, so a mobile
          // browser retracting its chrome does not leave the footer under it.
          // The explicit height also overrides `align-self: stretch`, which is
          // what actually severs the tie to <main>'s height.
          //
          // CONSUMER REQUIREMENT: sticky resolves against the nearest scrolling
          // ancestor, so an app that wraps <AppShell> in anything carrying
          // `overflow: hidden|auto|scroll` silently gets the old behaviour back
          // — the rail sticks to a box that never scrolls, which looks exactly
          // like this bug. If the rail stops following the page, look there
          // first.
          //
          // Stacking is unchanged: `relative` + z-index and `sticky` + z-index
          // both create a stacking context, so the hover overlay still paints
          // over <main> at z-rail with `shadow-pop`. Sticky does not clip, and
          // the grid container sets no overflow, so the rail still overhangs
          // its own 64px track when it expands unpinned.
          "sticky top-0 z-rail h-dvh self-start",
          "flex flex-col gap-1.5",
          // The NAV itself does not scroll — the destinations region below
          // does. See there for why the split matters.
          "overflow-hidden",
          "border-r border-line bg-card px-2.5 py-3.5",
          // BELOW md THIS IS THE DRAWER. It was `max-md:hidden` — the whole bug.
          // Fixed rather than sticky here: it must cover the page, not sit
          // beside it, and it leaves the one-column grid flow so <main> keeps
          // the full width. z-dialog, not z-rail: the backdrop is at z-rail and
          // the panel has to be above it.
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-dialog",
          // Always the expanded presentation on a phone. There is no hover to
          // peek with and no room for an icon-only column beside content, so the
          // drawer is the labelled rail or it is nothing. The label opacity is
          // forced in CSS rather than from React state so that a resize across
          // the breakpoint cannot leave a stale value behind — the drawer's own
          // `open` state is meaningless above md and vice versa.
          "max-md:w-rail-expanded max-md:[--rail-label-opacity:1]",
          "max-md:transition-transform",
          drawerOpen ? "max-md:translate-x-0 max-md:shadow-pop" : "max-md:-translate-x-full",
          // Same 160px as the grid track on `.e911-app`, so the same token — see
          // there for why the two cannot differ. RailLabel's fade deliberately
          // stays on duration-base: an opacity change is neither size nor
          // position, and finishing the fade first is what keeps a label from
          // being clipped by the edge on the way closed.
          "transition-[width] duration-slow ease-e911",
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
              // `text-seal`, not whichever other token happens to land near 9px:
              // the "911" lockup is the one piece of type in the system exempt
              // from the 1.4.3 contrast floor, and the token is scoped by name so
              // that exemption cannot spread to anything else this small. Its
              // line-height of 1 is invisible here — `place-items-center` centres
              // the line box and half-leading is symmetric, so the glyphs sit
              // exactly where they did under the inherited 1.5.
              //
              // THE 30px DISC STAYS AN ARBITRARY UTILITY, reviewed in 1.8.0 and kept
              // deliberately. This disc is the logotype's own geometry, not a
              // system metric: it is not a control, nothing aligns to it, and it
              // is centred inside a `size-tap` RailIcon that owns every
              // alignment the rail actually has. --font-size-seal is a token for
              // the opposite reason — it exists to CONTAIN the 1.4.3 logotype
              // exemption, which is a job beyond naming a number. A
              // `--seal-size` would have exactly one consumer forever and would
              // make 30px reachable by things that are not the seal, which is
              // how --font-size-h1 became the system's "h1 size" that 95% of its
              // h1s do not use. Redrawing the lockup is a brand change, and a
              // brand change should have to edit the lockup.
              className="grid size-[30px] place-items-center rounded-pill bg-brand text-seal font-extrabold text-white"
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

        {/* THE DESTINATIONS SCROLL; THE FOOTER DOES NOT (1.8.2).

            Bounding the nav to the viewport fixed the rail being as tall as the
            page, but it did not fix what was actually reported — Admin and the
            theme toggle unreachable without scrolling. Measured after that fix
            alone, at 1280x640 with a role carrying every destination: the nav
            was correctly 640px, and the footer's bottom edge sat at 664px. Still
            below the fold, just by 24px instead of 4516.

            A rail whose items exceed the viewport has to give somewhere, and the
            row height is not negotiable — 44px is --tap-target and this runs on
            wall tablets. So the DESTINATIONS take the overflow and the footer
            keeps its place: `flex-1` here claims the leftover height and scrolls
            inside it, which pins the footer to the bottom of the visible rail no
            matter how many items precede it. Admin and the theme toggle are then
            reachable at any viewport height and any item count, which is the
            actual requirement.

            `min-h-0` is load-bearing and easy to drop: a flex item's default
            `min-height: auto` refuses to shrink below its content, so without it
            this box grows to fit every row, the nav overflows again, and the
            footer goes back under the fold — the exact bug, reintroduced by an
            omission that looks like a no-op.

            Both overflow axes are named. A single `auto` axis forces the
            `visible` one to `auto` too, and a horizontally scrolling rail would
            be a new defect; overflow-x must stay hidden anyway because
            RailLabel's fade relies on it.

            `scrollbar-width: none`, and this is the one place this system hides
            an affordance on purpose. The rail's content box is 44px wide at
            --rail-width; a classic scrollbar takes ~15px of it and would leave
            every destination a 29px target, breaching --tap-target — a stated
            floor — to show a control nobody drags in a 64px column. Scrolling
            still works by wheel, trackpad and touch, keyboard focus scrolls its
            own row into view, and one hover, Tab or pin takes the rail to 224px
            where the question does not arise. */}
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto [scrollbar-width:none]">
          {items.map(renderRow)}
        </div>

        {footerItems?.length || railFooter ? (
          <div className="flex w-full shrink-0 flex-col gap-1.5 pt-1.5">
            {footerItems?.map(renderRow)}
            {railFooter}
          </div>
        ) : null}
      </nav>
      {/* tabIndex -1 so the skip link can actually MOVE focus here. Without it
          the browser scrolls to the anchor and leaves focus on the link, so the
          next Tab drops the operator straight back into the rail — the failure
          that makes people believe skip links do nothing. */}
      {/* `inert` while the drawer is open, and this is what makes the drawer
          modal without hand-rolling a focus trap. SKILL.md rule 10 is blunt
          about the cost of claiming modality you cannot keep: `aria-modal` with
          a trap that fails from outside is a promise to assistive technology
          that is worse than no promise. `inert` is the platform primitive for
          exactly this — it removes the subtree from the tab order AND from the
          accessibility tree in one attribute, so there is no branch to get
          wrong, no keydown handler that misses focus on <body>, and nothing to
          re-verify when a future control disables itself under a finger.
          Undefined rather than false: React renders `inert=""` for any truthy
          value and older runtimes stringify `false` into a live attribute. */}
      <main
        id={mainId}
        tabIndex={-1}
        inert={drawerOpen || undefined}
        className="min-w-0 outline-none"
      >
        {children}
      </main>
    </div>
  );
}

/* --------------------------------------------------------------- SkipLink */
export interface SkipLinkProps {
  /** `id` of the element to jump to — <main> in every current E911 app. */
  targetId: string;
  label?: string;
  className?: string;
}

/**
 * WCAG 2.4.1, and the one control in the system that is invisible until it is
 * focused. `AppShell` renders one; this is exported for the rare page that has
 * no shell (sign-in, a kiosk view) and still owes a bypass.
 *
 * Not `--tap-target` sized, deliberately: it only exists while it has keyboard
 * focus, so nothing can ever reach it with a finger. Height follows the control
 * scale like any other button.
 *
 * `z-popover`, not `z-rail`: the rail is the thing it has to appear over.
 */
export function SkipLink({ targetId, label = "Skip to main content", className }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only",
        "focus:absolute focus:left-3 focus:top-3 focus:z-popover",
        "focus:inline-flex focus:h-ctl focus:items-center focus:rounded-sm",
        "focus:border focus:border-line focus:bg-card focus:px-3.5",
        "focus:text-body focus:font-semibold focus:text-ink focus:shadow-pop",
        className
      )}
    >
      {label}
    </a>
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
        // `e911-ribbon` is not decoration: tokens.css uses it to re-point
        // --focus-ring for everything inside, because the brand orange ring is
        // 1.25:1 on this gradient. Drop the class and every control in the
        // ribbon loses its focus indicator, silently.
        "e911-ribbon relative m-4 overflow-hidden rounded-lg bg-ribbon p-5",
        "text-[var(--ribbon-text)]",
        className
      )}
    >
      {/* The Solstice glow disc. All three literals STAY, reviewed in 1.8.0 and
          kept deliberately: -60px, -80px and 240px are not three metrics, they
          are one piece of art. The disc is sized so that offsetting it by those
          two amounts leaves an arc bleeding off the top-right corner of the
          band, and the value of any one of them is meaningless without the
          other two. Naming them separately is what would let them drift —
          reposition it without resizing it and the whole circle lands inside
          the ribbon, which reads as a stray bubble rather than as light.
          aria-hidden, purely decorative, and nothing in the system aligns to
          it. If the band's proportions ever change, redraw all three together
          against spec.html. */}
      <div
        aria-hidden
        className="absolute -right-[60px] -top-[80px] size-[240px] rounded-pill bg-white/10"
      />
      {/* `tracking-[0.1em]` on the eyebrow is NOT redundant, and this is the one
          thing to read before editing either line.

          --text-micro is shared with the DataTable column header, whose tracking
          is 0.06em while the eyebrow's is 0.1em. The token therefore declares NO
          letter-spacing at all: any value it carried would be silently wrong at
          one of the two. Both call sites state their own, and data.tsx says the
          same thing from its side. Delete either as duplication and that header
          silently changes letterform, which nothing type-checks and no test
          catches. Stylesheet order is not the protection: a text-* utility
          resolves letter-spacing through --tw-tracking, which is exactly what
          tracking-* sets, so the explicit value wins regardless of emission
          order.

          No `leading-*` here, and none needed. Every 1.7.0 type token declares
          font-size ONLY, so both lines still inherit 1.5 from `.e911-app`,
          exactly as they did when they were px literals. During 1.7.0 the tokens
          briefly bundled the leading each role "should" have (1.2 and 1.15),
          which would have retightened this header by ~11px in every E911 app
          under a commit saying nothing changed; it was pinned here with
          `leading-normal` and then fixed properly in tokens.css instead, which
          is the layer where it reaches every consumer at once. If tighter
          display leading is ever wanted, that is still the place.

          The h1 needs no `font-bold` or `tracking-[…]`: --text-ribbon-h1 does
          carry 700 and -0.015em, at the values that shipped here as literals.
          That token has one consumer, so it can afford to; --text-micro has two
          that disagree, so it cannot. */}
      {eyebrow ? (
        <div className="text-micro font-semibold uppercase tracking-[0.1em]">
          {eyebrow}
        </div>
      ) : null}
      <h1 className="mt-1 font-display text-ribbon-h1">{title}</h1>
      {subtitle ? <p className="mt-0.5 text-ribbon-meta opacity-95">{subtitle}</p> : null}
      {actions ? (
        // The scrim is the slot's, not the button's. Anything right-aligned on
        // this gradient lands in the gold terminus — measured 3.06:1 for plain
        // --ribbon-text at 1920px — and apps put freshness stamps and counts in
        // here beside the buttons. Padding so the plate reads as a ground for
        // the cluster rather than a box drawn tight around it.
        <div
          className={cn(
            "absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2",
            "rounded-sm bg-[var(--ribbon-actions-scrim)] px-1.5 py-1",
            "max-md:static max-md:mt-3 max-md:translate-y-0"
          )}
        >
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
        // `rounded-sm`, not the 9px this drew until 1.7.0. The system has four
        // radii and a pill; 9px was a fifth, declared nowhere, so no consumer
        // could name it or override it. Worse, it sat 1px OUTSIDE the actions
        // plate's own `rounded-sm` — an inner corner rounder than the outer
        // corner it nests 6px inside, which is the one nesting relationship that
        // reads as a rendering fault rather than a choice.
        // 8 and 10 are equidistant from 9, so "nearest" is settled by meaning:
        // --e911-radius-sm is documented "chips, inputs, rail buttons" and
        // --e911-radius-md is "cards". This is a button, and every other button
        // in the system — Button in core.tsx included, at 1px shorter — is
        // already rounded-sm.
        //
        // `h-ctl` (1.8.0) closes the second half of that sentence. This drew
        // 33px — one pixel taller than --control-height, which every other
        // control in the system takes, and one pixel off the 4px grid the rest
        // of the metrics sit on. Nothing depended on the extra pixel: the
        // ribbon's height comes from its eyebrow, h1 and subtitle, and this
        // button is absolutely positioned and centred inside the actions plate,
        // so 33 and 32 place it identically. It was the same hand as the 9px —
        // a control drawn by eye beside a system that had already named the
        // number — and 1.7.0 corrected the radius while leaving the height,
        // because a rename commit could not absorb a resize.
        "h-ctl rounded-sm px-3.5 text-ribbon-meta transition duration-fast ease-e911",
        variant === "primary"
          ? // The pill and its label are ONE token pair. This read `bg-white
            // text-brand-text`, and --text-brand flips to a light orange in dark
            // mode while the pill stayed white — 2.01:1, the worst ratio in the
            // system. Whatever repaints the pill must repaint the label with it.
            "bg-[var(--ribbon-action-surface)] font-bold text-[var(--ribbon-action-text)] hover:brightness-95"
          : // No resting fill of its own since 1.4.0: Ribbon's actions slot
            // carries --ribbon-actions-scrim for everything in it, and stacking
            // a second scrim here made the ghost darker than the plate it sits
            // on. Hover still DEEPENS the ground rather than lightening it —
            // the original `hover:bg-white/10` moved it the wrong way, and a
            // hover state is still text that owes 4.5:1. Use this button inside
            // <Ribbon actions>; that slot is where its ground comes from.
            "border border-white/50 font-semibold text-[var(--ribbon-text)] " +
            "hover:bg-[var(--ribbon-ghost-hover)]",
        className
      )}
      {...rest}
    />
  );
}
