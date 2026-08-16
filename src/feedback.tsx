// The two states a screen is in before it has anything to show (1.7.0).
//
// NO "use client" DIRECTIVE, and that is deliberate — this is the first module
// in the package besides contract.ts without one. Neither component here holds
// state, takes a handler, or touches the DOM, so nothing forces the boundary,
// and leaving it off means a SERVER page can render an empty state directly.
// That matters because the alternative is what the first consuming app already
// had to build for DataTable's `cell` callbacks: a one-line "use client" file
// sitting beside page.tsx purely to host something that renders no interaction.
// An app that wants the boundary still gets it — importing this from a client
// module is exactly as valid, and `action` is usually a Button, which brings
// its own.
//
// `cn` therefore comes from "./contract", not "./core": core.tsx carries the
// directive, and importing through it would drag this module across the
// boundary it is avoiding. See the note at the top of contract.ts.
import * as React from "react";
import { cn } from "./contract";

/* ------------------------------------------------------------- EmptyState */
export interface EmptyStateProps {
  /**
   * WHAT IS ABSENT, in the operator's words and scoped to what they are
   * looking at: "No exceptions in this pay period", not "No data". A title
   * that could sit on any screen in the app tells the reader nothing about
   * the one they are on.
   */
  title: string;
  /**
   * WHY it is absent, when the reason is not obvious. This is the half that
   * makes an empty state teach rather than apologise: "Punches are matched
   * overnight, so today's exceptions appear tomorrow morning" is the
   * difference between an operator who waits and an operator who files a
   * ticket. Omit it when the title genuinely says everything.
   */
  body?: React.ReactNode;
  /**
   * THE ACTION THAT ENDS THE STATE — usually a Button, sometimes a link. An
   * empty state with a reachable exit is a screen; one without is a dead end,
   * and a dead end is where an operator starts inventing a workaround.
   */
  action?: React.ReactNode;
  /**
   * Decorative only. Rendered inside an aria-hidden wrapper, because a lucide
   * glyph has no accessible name worth announcing ahead of the title and every
   * icon set eventually ships one that does.
   */
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Deliberately NOT a heading, at any rung.
 *
 * An EmptyState almost always renders inside a DomainCard that already owns a
 * heading, and DomainCard spent 1.4.0 learning that the outline is a structural
 * decision the page has to make rather than one a component may guess (see
 * `titleLevel`). A component that plants an h3 wherever it lands re-opens that,
 * one card at a time, and the failure is invisible until someone runs the
 * outline. The title is the loudest thing in the box because of its size and
 * weight, which is what the eye is using here anyway.
 */
export function EmptyState({ title, body, action, icon, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        // Same px-4 py-9 as DataTable's own empty row, so a card that swaps a
        // bare string for an EmptyState does not change height.
        "flex flex-col items-center gap-2 px-4 py-9 text-center",
        className
      )}
    >
      {icon ? (
        <span
          aria-hidden
          className="flex size-9 items-center justify-center rounded-pill bg-tint text-faint"
        >
          {icon}
        </span>
      ) : null}
      <p className="text-body font-semibold text-ink">{title}</p>
      {body ? (
        // A measure, not a container width: centred prose that runs the full
        // width of a 1440px card is two eye-sweeps per line and reads as a
        // paragraph nobody meant you to read. Same escape hatch FormField uses
        // for its 340px column, in ch rather than px because this one is
        // measured in characters.
        <p className="max-w-[42ch] text-ui-sm text-muted">{body}</p>
      ) : null}
      {action ? <div className="mt-1 flex items-center gap-2">{action}</div> : null}
    </div>
  );
}

/* --------------------------------------------------------------- Skeleton */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * `text` (default) paints one line of table text. `row` paints a full
   * --row-height table row, which is the size that matters: it is what lets a
   * loading table hold its own layout instead of collapsing to a header strip
   * and shoving the page back down when the rows land.
   */
  size?: "text" | "row";
}

/**
 * Width comes from `className` (`w-2/3`, `w-24`) rather than from a prop: a
 * skeleton's width is a layout decision belonging to the cell it sits in, and
 * a `width` prop taking a CSS length is how raw values get back into app code
 * through a component that exists to keep them out.
 *
 * aria-hidden, always. A skeleton is a picture of content that does not exist
 * yet; announcing it gives a screen-reader user a table of blanks to walk
 * through. The LOADING state belongs on the container instead, as aria-busy —
 * DataTable sets it, and any app hand-rolling a skeleton layout owes the same.
 */
export function Skeleton({ size = "text", className, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "rounded-sm bg-tint",
        size === "row" ? "h-row" : "h-3",
        // motion-reduce:animate-none is load-bearing, and it is NOT redundant
        // with the global rule in tokens.css. That rule clamps every animation
        // to 0.01ms under prefers-reduced-motion, which STOPS a transition but
        // does not stop this: an infinite pulse at 0.01ms keeps running, so the
        // browser samples it at an arbitrary point every frame and the bar
        // strobes between full and half opacity — faster motion than it had
        // before the user asked for less. Turning the animation off leaves the
        // bar parked at its resting style, which is a fully opaque bg-tint:
        // still plainly visible, which is the other half of the requirement. A
        // skeleton that vanishes for a reduced-motion user is a blank card.
        //
        // The 2s cadence is Tailwind's own `animate-pulse`, not a system token,
        // and that is on purpose: the system's three durations top out at 240ms
        // — a shimmer at 240ms is a strobe — and a token with one consumer is
        // how --font-size-h1 ended up describing a size almost nothing renders.
        "animate-pulse motion-reduce:animate-none",
        className
      )}
      {...rest}
    />
  );
}
