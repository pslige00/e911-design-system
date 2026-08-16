// The message a screen attaches to a REGION OF ITSELF (1.8.0) — a form that was
// refused, a grid whose numbers come with a caveat, a pay period that is closed.
//
// WHY IT EXISTS. The first consuming app painted 22 of these by hand across
// seven files, and six of them were the same class string:
//
//     rounded-sm bg-bad-soft px-3 py-2 text-body text-bad
//
// with two of the six also drawing `border-chip border-warn` and the other four
// not, because nothing said which was right. That is the DataTable scroll region
// again: the system asked for one thing six times and answering none of them.
// It shipped two defects with it. The first is that a hand-rolled pill is a
// review block here (see the anti-pattern list). The second is worse — of those
// 22, three carried a live region. Per file: alignment-grid 7 callouts / 0
// announcements, staffing-grid 2/0, schedule-tabs 3/0, request-form 1/0,
// kiosk-view 3/1, clock-view 5/2. A dispatcher on a screen reader was told
// nothing when a warning appeared on the screen in front of them.
//
// WHAT IT IS NOT. Not a Toast: a toast is transient, floats in its own layer,
// and is ALWAYS new — which is the whole reason toast.tsx can derive its live
// region from tone alone and this file cannot (see `kind`). Not a StatusTag
// either: that is a pill LABELLING something — a row, a cell, a value — and it
// carries a word. A Callout is a message with a place on the page.
//
// NO "use client" DIRECTIVE, deliberately, making this the third module after
// contract.ts and feedback.tsx without one. Nothing here holds state, takes a
// handler, or touches the DOM: `action` is a slot, and what an app puts in it is
// usually a Button, which brings its own boundary. So a SERVER page can render a
// standing notice — "this pay period is closed" — with no client wrapper file
// beside it, which is exactly the wrapper the first app had to invent for
// DataTable's `cell` callbacks.
//
// `cn` and `Tone` therefore come from "./contract", not "./core": core.tsx
// carries the directive, and importing through it would drag this module across
// the boundary it is avoiding. See the note at the top of contract.ts.
import * as React from "react";
import { cn, type Tone } from "./contract";

/* ------------------------------------------------------------------- marks */
/**
 * One mark per tone, and they are distinguished by SHAPE before colour.
 *
 * The five light-theme tone colours sit inside a 0.018 luminance band (see Tone
 * in contract.ts), so a tinted panel with prose in it is five shades of one grey
 * to a dichromat, and to anyone reading a dim wall tablet from across the room.
 * StatusTag answers that with pill + dot + word. A Callout's word is its own
 * content — which the component cannot supply — so the mark is what has to carry
 * the tone for a sighted reader: `warn` is the only triangle, and the four
 * circles differ by a check, a cross, an i and a dash rather than by hue.
 *
 * They are `aria-hidden` and NOT overridable by a prop. A caller-supplied icon
 * is the one thing that could quietly remove the non-colour channel this
 * component exists to add, and `srToneWord` below is what a screen reader gets
 * instead.
 */
const markProps = {
  "aria-hidden": true,
  viewBox: "0 0 16 16",
  // mt-0.5 centres a 16px mark on the first line of `text-body`, whose line box
  // is 20.25px (13.5 × 1.5). Without it the mark sits 2px high and reads as
  // hanging off the top of the sentence.
  className: "mt-0.5 size-4 shrink-0",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const satisfies React.SVGProps<SVGSVGElement>;

// The bang and the i-dot are zero-length segments (`h.01`), which paint as a dot
// only because strokeLinecap is round. Drop the cap and they vanish.
const toneMark: Record<Tone, React.ReactElement> = {
  ok: (
    <svg {...markProps}>
      <circle cx="8" cy="8" r="6" />
      <path d="M5.3 8.2l1.9 1.9L10.8 6.3" />
    </svg>
  ),
  warn: (
    <svg {...markProps}>
      <path d="M8 2.3l6.4 11.4H1.6z" />
      <path d="M8 6.6v3M8 11.7h.01" />
    </svg>
  ),
  bad: (
    <svg {...markProps}>
      <circle cx="8" cy="8" r="6" />
      <path d="M6 6l4 4M10 6l-4 4" />
    </svg>
  ),
  info: (
    <svg {...markProps}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 7.6v3.2M8 5.2h.01" />
    </svg>
  ),
  neutral: (
    <svg {...markProps}>
      <circle cx="8" cy="8" r="6" />
      <path d="M5.4 8h5.2" />
    </svg>
  ),
};

/**
 * What a screen reader hears in place of the mark. The mark is the sighted
 * reader's non-colour channel; this is everyone else's, and without it the tone
 * of a Callout is conveyed by colour alone to the operator least able to use it.
 *
 * `neutral` deliberately has none. It means "known state, no valence", so there
 * is no severity to name and "Neutral:" would be noise — the same reasoning as
 * rule 4, which says a label that reads identically without a pill gets no pill.
 *
 * Not a prop, for the reason DataTable has no free-form `rowLinkLabel`: a
 * caller-supplied severity word is how "Heads up" ends up prefixed to a refusal.
 */
const srToneWord: Record<Tone, string | null> = {
  ok: "Success",
  warn: "Warning",
  bad: "Error",
  info: "Note",
  neutral: null,
};

/**
 * Fill, stroke and text in one tone, which is what the six hand-rolled versions
 * were each half of — four drew no border and two did. The border is the system
 * settling it: on a dark theme the soft fills are 14–15% alpha over the card, and
 * a tint that faint is not a reliable way to see where a multi-line message
 * starts and stops.
 *
 * Text sits in the tone colour rather than on --text-primary, matching
 * FormField's error line and all 22 call sites. It is also the only choice the
 * contrast audit already measures: every pair here is a `--status-*` on its own
 * `--status-*-soft`, scored at 11px/600 for StatusTag and 10px/400 for CertChip,
 * both against the same 4.5:1 threshold this text is held to. Ink on a soft fill
 * would be a pair no instrument in this repo checks.
 */
const calloutTone: Record<Tone, string> = {
  ok: "border-ok bg-ok-soft text-ok",
  warn: "border-warn bg-warn-soft text-warn",
  bad: "border-bad bg-bad-soft text-bad",
  info: "border-info bg-info-soft text-info",
  neutral: "border-neutral bg-neutral-soft text-neutral",
};

/* ---------------------------------------------------------------- Callout */
export interface CalloutProps
  // `role` is omitted because `kind` decides it; a caller who sets both would
  // silently get whichever this file spreads last. `title` is omitted because it
  // means something else here — the heading of the message, not the native
  // tooltip attribute, which rule 5 forbids as a tooltip anyway.
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "title"> {
  tone: Tone;
  /**
   * WHAT THIS MESSAGE IS — not how it looks. `tone` is the only thing that
   * changes the appearance of a Callout; this changes whether it is announced.
   *
   * - `"standing"` (default) — part of the page as rendered. It was already
   *   true before the operator did anything: "This pay period is closed",
   *   "Coverage below minimum is computed from the posted roster". Not
   *   announced.
   * - `"event"` — something just happened and this is the news. A sign-in that
   *   was refused, a punch the server rejected, a save that failed. Announced.
   *
   * THE FAILURE THIS PREVENTS, in both directions.
   *
   * `role="alert"` fires when the node MOUNTS. Put it on a standing note and
   * every page load interrupts a screen-reader user with a sentence that was not
   * news — one screen in the first app carries seven of these, so that is seven
   * interruptions to read a grid. The operator's defence is to tune the channel
   * out, and a channel nobody trusts is worse than a quiet one, because the
   * quiet one can still be fixed. Leave it off an event and the sign-in form
   * refuses a credential in silence.
   *
   * The component cannot tell which it is, and the tone cannot tell it either —
   * "This pay period is closed" and "Your punch was rejected" are both `bad`.
   * That is precisely where toast.tsx's rule stops applying: a toast is ALWAYS
   * new, so tone is the only open question there and `tone === "bad" ? "alert" :
   * "status"` is right. Here newness and urgency are two questions, so `kind`
   * answers the first and `tone` still answers the second.
   *
   * The default is the safe one: a Callout nobody classified is silent, which
   * costs one message. The other default would cost the channel.
   */
  kind?: "standing" | "event";
  /**
   * The heading of the message, when the body needs more than one sentence.
   * Rendered as emphasised text and NOT as a heading at any rung — same reason
   * as EmptyState: a Callout sits inside a DomainCard that already owns the
   * outline, and `titleLevel` exists because that is the page's decision.
   */
  title?: string;
  children: React.ReactNode;
  /** What ends the state — usually a Button. */
  action?: React.ReactNode;
}

/**
 * `id` and the rest of the div's attributes pass through, and `id` is the one
 * that matters: a Callout explaining why a field was refused should also be
 * pointed at by that field's `aria-describedby`. The sign-in form is the pattern
 * — it moves focus to the first invalid input and describes it with the same
 * node, so the sentence is read again on arrival, which also covers the case
 * where the alert fired before the assistive technology was listening.
 *
 * KNOWN LIMIT, and the sign-in form is also the workaround. A live region
 * announces a CHANGE. Submit a form twice and get the identical refusal back
 * and the node never unmounts and its text never changes, so nothing is
 * announced the second time — the operator hears their first attempt fail and
 * their second attempt do nothing at all. Moving focus onto the described
 * control is what makes the second attempt audible; re-keying the Callout so it
 * genuinely remounts also works. Neither is something this component can do on
 * the caller's behalf.
 */
export function Callout({
  tone,
  kind = "standing",
  title,
  children,
  action,
  className,
  ...rest
}: CalloutProps) {
  const announced = kind === "event";
  const word = srToneWord[tone];
  return (
    <div
      role={announced ? (tone === "bad" ? "alert" : "status") : undefined}
      // Both roles imply aria-atomic in the spec, and it is stated anyway — same
      // as toast.tsx — because what it buys is worth not leaving to an
      // implementation: without it a reader announces only the node that
      // changed, i.e. the body alone, with the title that scopes it left behind.
      // Set only alongside the role, since it means nothing without one.
      aria-atomic={announced ? true : undefined}
      className={cn(
        "flex items-start gap-2.5 rounded-sm border-chip px-3 py-2",
        calloutTone[tone],
        className
      )}
      {...rest}
    >
      {toneMark[tone]}
      <div className="min-w-0 flex-1 text-body">
        {word ? <span className="sr-only">{`${word}: `}</span> : null}
        {title ? <p className="font-semibold">{title}</p> : null}
        {/* A div, not a p: callers pass lists — "three shifts are unfilled",
            then the three — and a <ul> inside a <p> is a nesting error the
            browser fixes by closing the paragraph early, which reparents half
            the message out of the callout. */}
        <div>{children}</div>
        {action ? <div className="mt-2 flex items-center gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
