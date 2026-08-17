"use client";

import * as React from "react";
import { cn, isFocusVisible } from "./core";

/** Long enough that sweeping the rail doesn't strobe tooltips at you. */
const DEFAULT_DELAY_MS = 350;
/**
 * The grace period between the pointer leaving the trigger and the bubble
 * going away, and half of WCAG 1.4.13 "Hoverable" (AA). `GAP` px of dead space
 * separate trigger from bubble, so closing synchronously on `pointerleave` —
 * which is what this did until now — killed the bubble *before* the pointer
 * could arrive: the one gesture that reads a tooltip too big to take in at a
 * glance was also the gesture that dismissed it. The figure is sized for the
 * slow crossing, not the fast one: at 400% zoom, a routine desk configuration
 * on this floor, those 8px are 32 device pixels of hand travel.
 */
const CLOSE_DELAY_MS = 250;
const GAP = 8;

/** useLayoutEffect warns when a client component gets server-rendered first. */
const useIsoLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

/** The subset of props Tooltip attaches to its trigger. */
interface TriggerProps {
  onPointerEnter?: React.PointerEventHandler<HTMLElement>;
  onPointerLeave?: React.PointerEventHandler<HTMLElement>;
  onPointerDown?: React.PointerEventHandler<HTMLElement>;
  onFocus?: React.FocusEventHandler<HTMLElement>;
  onBlur?: React.FocusEventHandler<HTMLElement>;
  onKeyDown?: React.KeyboardEventHandler<HTMLElement>;
  "aria-describedby"?: string;
}

export interface TooltipProps {
  content: React.ReactNode;
  /**
   * A single element that renders a real DOM node and spreads its props —
   * usually a <button>. The handlers and aria-describedby land on that node
   * rather than a wrapper, because a description on a wrapper is never read.
   */
  children: React.ReactElement<TriggerProps>;
  /** The rail should pass "right"; a 64px column has no room above its icons. */
  placement?: TooltipPlacement;
  delay?: number;
}

/**
 * The label the 64px icon rail promises. Hover and keyboard focus both open it;
 * pointer focus does not, so clicking a rail icon doesn't leave a tooltip
 * hanging over the page you just navigated to.
 *
 * Like the other floating layers here it is `position: fixed` rather than a
 * portal (see the note in select.tsx) — which is also what lets a tooltip on a
 * table's action button escape the card's `overflow-hidden`.
 */
export function Tooltip({
  content,
  children,
  placement = "top",
  delay = DEFAULT_DELAY_MS,
}: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLElement | null>(null);
  const bubbleRef = React.useRef<HTMLDivElement | null>(null);
  const timer = React.useRef(0);
  const id = `${React.useId()}-tip`;

  const [style, setStyle] = React.useState<React.CSSProperties>({
    position: "fixed",
    top: 0,
    left: 0,
    visibility: "hidden",
  });

  const cancel = React.useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = 0;
  }, []);

  const close = React.useCallback(() => {
    cancel();
    setOpen(false);
  }, [cancel]);

  const openAfter = React.useCallback(
    (ms: number) => {
      cancel();
      if (ms <= 0) {
        setOpen(true);
        return;
      }
      timer.current = window.setTimeout(() => setOpen(true), ms);
    },
    [cancel]
  );

  const closeAfter = React.useCallback(
    (ms: number) => {
      // Shares `timer` with openAfter on purpose: open and close are the same
      // transition seen from two sides, and only the last one asked for may
      // land. On separate timers a pointer swept across a rail leaves both
      // pending and the loser wins about half the time.
      cancel();
      timer.current = window.setTimeout(() => setOpen(false), ms);
    },
    [cancel]
  );

  React.useEffect(() => cancel, [cancel]);

  useIsoLayoutEffect(() => {
    if (!open) return;

    const place = () => {
      const anchor = anchorRef.current;
      const bubble = bubbleRef.current;
      if (!anchor || !bubble) return;
      const r = anchor.getBoundingClientRect();
      const w = bubble.offsetWidth;
      const h = bubble.offsetHeight;

      // Flip to the opposite side rather than letting the bubble hang off the
      // viewport — the rail lives hard against the left edge.
      let side = placement;
      if (side === "top" && r.top - GAP - h < 0) side = "bottom";
      else if (side === "bottom" && r.bottom + GAP + h > window.innerHeight) side = "top";
      else if (side === "left" && r.left - GAP - w < 0) side = "right";
      else if (side === "right" && r.right + GAP + w > window.innerWidth) side = "left";

      let top: number;
      let left: number;
      if (side === "top" || side === "bottom") {
        top = side === "top" ? r.top - GAP - h : r.bottom + GAP;
        left = r.left + r.width / 2 - w / 2;
      } else {
        left = side === "left" ? r.left - GAP - w : r.right + GAP;
        top = r.top + r.height / 2 - h / 2;
      }

      setStyle({
        position: "fixed",
        top: Math.max(GAP, Math.min(top, window.innerHeight - h - GAP)),
        left: Math.max(GAP, Math.min(left, window.innerWidth - w - GAP)),
        visibility: "visible",
      });
    };

    place();
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);

    // Escape has to work while merely hovering, when focus is somewhere else
    // entirely — so this listens at the document, not the trigger.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, placement, close]);

  const childProps = children.props;

  const trigger = React.cloneElement(children, {
    "aria-describedby": id,
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
      childProps.onPointerEnter?.(e);
      anchorRef.current = e.currentTarget;
      // Touch has no hover: the press itself is the interaction, and a tooltip
      // that opens under the finger only hides what was just tapped.
      //
      // KNOWN GAP, not a decision this guard should be read as settling: with
      // `onPointerDown` closing too, `content` is unreachable for a sighted
      // touch user while a screen reader still reads the mounted copy below —
      // on a wall tablet, which is the device this system exists for. Until
      // that has its own pass, do not put a fact in a Tooltip that is stated
      // nowhere else.
      if (e.pointerType !== "touch") openAfter(delay);
    },
    onPointerLeave: (e: React.PointerEvent<HTMLElement>) => {
      childProps.onPointerLeave?.(e);
      // NOT close(): the pointer may be on its way to the bubble. See
      // CLOSE_DELAY_MS — the bubble's own pointerenter is what cancels this.
      closeAfter(CLOSE_DELAY_MS);
    },
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      childProps.onPointerDown?.(e);
      close();
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      childProps.onFocus?.(e);
      anchorRef.current = e.currentTarget;
      // No delay for keyboard: the operator is already committed to this
      // control, and a delay reads as the tooltip being broken.
      if (isFocusVisible(e.currentTarget)) openAfter(0);
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      childProps.onBlur?.(e);
      close();
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      childProps.onKeyDown?.(e);
      if (e.key === "Escape" && open) {
        e.stopPropagation(); // don't also close the dialog the trigger sits in
        close();
      }
    },
  });

  return (
    <>
      {trigger}
      {/*
        The described-by target is always mounted, so the description resolves
        the instant focus lands — a tooltip that only enters the DOM after the
        focus event is announced late or not at all. The visible bubble is a
        second, aria-hidden copy; only this one reaches the a11y tree.
      */}
      <span id={id} role="tooltip" className="sr-only">
        {content}
      </span>
      {open ? (
        <div
          ref={bubbleRef}
          aria-hidden
          style={style}
          // The other half of 1.4.13 Hoverable, and the half the grace period
          // alone cannot buy: a bubble that hears no pointer events cannot hold
          // a hover, so `pointer-events-none` here meant the pointer could
          // reach the bubble and it would still close on the trigger's timer.
          // Both halves are needed — this to survive the dwell, CLOSE_DELAY_MS
          // to survive the crossing.
          onPointerEnter={cancel}
          onPointerLeave={() => closeAfter(CLOSE_DELAY_MS)}
          // What being hoverable costs, paid deliberately: while it is up the
          // bubble is what a press lands on, and on the coverage grid it covers
          // about seven cells. Closing on its own pointerdown spends one click
          // getting out of the way, rather than leaving an operator pressing a
          // cell that cannot hear him. `aria-hidden` stays regardless — the
          // mounted copy above is the only one in the a11y tree, and two would
          // be read twice.
          onPointerDown={close}
          className={cn(
            "z-popover max-w-[240px] rounded-sm border border-line bg-card",
            "px-2 py-1 text-ui-sm font-medium text-ink shadow-pop"
          )}
        >
          {content}
        </div>
      ) : null}
    </>
  );
}
