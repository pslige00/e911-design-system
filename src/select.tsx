"use client";

import * as React from "react";
import { cn, CONTROL_HEIGHT, type ControlSize } from "./core";

/* ---------------------------------------------------------- anchored layer */
/**
 * useLayoutEffect logs during SSR, and every one of these components is a
 * client component that Next still renders on the server first.
 */
const useIsoLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

export interface AnchoredLayerOptions {
  /** Popover width tracks the trigger — the listbox reads as part of the control. */
  matchWidth?: boolean;
  /** Cap the layer at the space available and let it scroll (listboxes, not calendars). */
  clampHeight?: boolean;
  gap?: number;
}

/**
 * Positions a floating layer against a trigger using `position: fixed`.
 *
 * Fixed is the load-bearing choice: DomainCard sets `overflow-hidden` for its
 * 4px domain edge, and an absolutely positioned popover inside one gets sliced
 * off at the card boundary. A fixed layer is laid out against the viewport, so
 * the card's clip never applies. (The exception is a transformed ancestor,
 * which becomes the containing block — don't mount controls inside the
 * Ribbon's translated action row.) A React portal would sidestep even that,
 * but react-dom is a peer dependency whose types this package doesn't carry.
 *
 * Exported so DateField's calendar can reuse it; Select is the canonical
 * popover in this system, so the mechanism lives with it rather than in a
 * one-function module.
 */
export function useAnchoredLayer(
  open: boolean,
  anchorRef: React.RefObject<HTMLElement | null>,
  layerRef: React.RefObject<HTMLElement | null>,
  { matchWidth = false, clampHeight = false, gap = 6 }: AnchoredLayerOptions = {}
): React.CSSProperties {
  const [style, setStyle] = React.useState<React.CSSProperties>({
    position: "fixed",
    top: 0,
    left: 0,
    // Hidden for the single frame between mount and measurement, so the layer
    // never flashes in the top-left corner.
    visibility: "hidden",
  });

  const place = React.useCallback(() => {
    const anchor = anchorRef.current;
    const layer = layerRef.current;
    if (!anchor || !layer) return;

    const rect = anchor.getBoundingClientRect();
    const width = matchWidth ? rect.width : layer.offsetWidth;
    const height = layer.offsetHeight;
    const roomBelow = window.innerHeight - rect.bottom - gap * 2;
    const roomAbove = rect.top - gap * 2;
    const flip = height > roomBelow && roomAbove > roomBelow;

    let left = rect.left;
    left = Math.min(left, window.innerWidth - width - gap);
    left = Math.max(gap, left);

    setStyle({
      position: "fixed",
      top: flip ? Math.max(gap, rect.top - gap - height) : rect.bottom + gap,
      left,
      width: matchWidth ? rect.width : undefined,
      maxHeight: clampHeight ? Math.max(120, flip ? roomAbove : roomBelow) : undefined,
      visibility: "visible",
    });
  }, [anchorRef, layerRef, matchWidth, clampHeight, gap]);

  useIsoLayoutEffect(() => {
    if (!open) return;
    place();

    // Capture phase: the scroll that moves the trigger is usually on an inner
    // container, and scroll events from those don't bubble to window.
    const onScroll = () => place();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);

    // Content can change height after mount (calendar month with six rows,
    // a filtered option list) — re-place instead of leaving it mispositioned.
    // `typeof` guard, not just the null check: jsdom has no ResizeObserver, and
    // an unguarded `new` is a ReferenceError that kills the whole test file — in
    // a CONSUMER's suite, naming neither this package nor the component. This
    // hook backs Select, DateField and every anchored layer, so it is the single
    // widest blast radius in the package. Re-placement is a refinement over a
    // layer that is already positioned once on open.
    const layer = layerRef.current;
    const ro =
      layer && typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => place()) : null;
    if (ro) ro.observe(layer!);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      ro?.disconnect();
    };
  }, [open, place, layerRef]);

  return style;
}

/**
 * Closes the layer on a pointer press anywhere outside both the trigger and the
 * layer. pointerdown rather than click so the popover is gone before the press
 * lands on whatever is underneath.
 */
export function useDismissOnOutsidePress(
  open: boolean,
  refs: Array<React.RefObject<HTMLElement | null>>,
  onDismiss: () => void
): void {
  const dismissRef = React.useRef(onDismiss);
  dismissRef.current = onDismiss;

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (refs.some((r) => r.current?.contains(target))) return;
      dismissRef.current();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, ...refs]);
}

/* ------------------------------------------------------------------ icons */
function ChevronIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 6.5L8 10l3.5-3.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

/* ----------------------------------------------------------------- Select */
export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T extends string = string> {
  value: T | null;
  onChange: (value: T) => void;
  options: Array<SelectOption<T>>;
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Painted height of the trigger (1.5.0). `tap` = 44px — see ControlSize. */
  size?: Extract<ControlSize, "md" | "tap">;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  /**
   * DECLARED, not incidental. `FormField` marks an errored control by putting
   * `aria-invalid` in the props object it hands its child, and until 1.10.0 this
   * landed here only because the rest spread happened to carry it — undeclared,
   * so a refactor could have dropped it with nothing to say so. It is read
   * alongside `invalid`: whichever channel says the control is bad, both the
   * announcement and the red stroke follow. See the border note below for why
   * the className channel alone cannot carry this.
   */
  "aria-invalid"?: boolean | "true" | "false";
}

/** Typeahead buffer lifetime — long enough to spell "Battalion", short enough
    that a pause starts a new search. */
const TYPEAHEAD_RESET_MS = 700;

/**
 * Listbox select. Not a native `<select>`: the system has no styled native
 * select, and the option list has to carry a check mark, disabled options, and
 * 44px rows that a UA popup can't be told to render.
 *
 * Focus stays on the trigger and the active option is announced through
 * `aria-activedescendant` (the ARIA select-only combobox pattern), which keeps
 * a single tab stop and avoids the focus ping-pong of moving DOM focus into
 * the list.
 */
export function Select<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  id,
  disabled = false,
  invalid = false,
  size = "md",
  className,
  "aria-invalid": ariaInvalid,
  ...aria
}: SelectProps<T>) {
  // ONE boolean drives both the announcement and the paint. They used to be
  // separate: `invalid` painted the border and a caller's `aria-invalid` (which
  // is all `FormField` sends) reached only the accessibility tree, so an
  // errored Select was announced invalid and drawn valid. Two channels
  // disagreeing about the same fact is worse than either being absent.
  const showInvalid = invalid || ariaInvalid === true || ariaInvalid === "true";

  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const listRef = React.useRef<HTMLUListElement | null>(null);
  const typeahead = React.useRef({ buffer: "", at: 0 });

  const reactId = React.useId();
  const listId = `${reactId}-list`;
  const optionId = (index: number) => `${reactId}-opt-${index}`;

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const layerStyle = useAnchoredLayer(open, triggerRef, listRef, {
    matchWidth: true,
    clampHeight: true,
  });

  useDismissOnOutsidePress(open, [triggerRef, listRef], () => setOpen(false));

  const close = React.useCallback((refocus: boolean) => {
    setOpen(false);
    setActiveIndex(-1);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const openList = React.useCallback(
    (startAt: number) => {
      setOpen(true);
      setActiveIndex(startAt);
    },
    []
  );

  /** Walks past disabled options; returns the original index if none qualify. */
  const step = React.useCallback(
    (from: number, delta: number): number => {
      const count = options.length;
      if (count === 0) return -1;
      let next = from;
      for (let i = 0; i < count; i += 1) {
        next = next + delta;
        if (next < 0) next = 0;
        if (next > count - 1) next = count - 1;
        if (!options[next]?.disabled) return next;
      }
      return from;
    },
    [options]
  );

  const firstEnabled = React.useCallback(
    (fromEnd = false): number => {
      const indexes = options.map((_, i) => i);
      const order = fromEnd ? indexes.reverse() : indexes;
      return order.find((i) => !options[i]?.disabled) ?? -1;
    },
    [options]
  );

  const commit = React.useCallback(
    (index: number) => {
      const option = options[index];
      if (!option || option.disabled) return;
      onChange(option.value);
      close(true);
    },
    [options, onChange, close]
  );

  // Keep the active option in view when the arrow keys walk past the scroll edge.
  React.useEffect(() => {
    if (!open || activeIndex < 0) return;
    const node = document.getElementById(optionId(activeIndex));
    node?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, reactId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const key = e.key;

    if (key === "Escape") {
      if (open) {
        // Swallow it so an enclosing Dialog stays open — one layer per press.
        e.stopPropagation();
        e.preventDefault();
        close(true);
      }
      return;
    }

    if (key === "Tab") {
      if (open) close(false);
      return;
    }

    if (!open) {
      if (key === "ArrowDown" || key === "ArrowUp" || key === "Enter" || key === " ") {
        e.preventDefault();
        openList(selectedIndex >= 0 ? selectedIndex : firstEnabled());
        return;
      }
    } else {
      if (key === "Enter" || key === " ") {
        e.preventDefault();
        commit(activeIndex);
        return;
      }
      if (key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i < 0 ? firstEnabled() : step(i, 1)));
        return;
      }
      if (key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i < 0 ? firstEnabled(true) : step(i, -1)));
        return;
      }
      if (key === "Home") {
        e.preventDefault();
        setActiveIndex(firstEnabled());
        return;
      }
      if (key === "End") {
        e.preventDefault();
        setActiveIndex(firstEnabled(true));
        return;
      }
    }

    // Typeahead. Single-character repeats cycle through same-initial options,
    // which is how a native select behaves and how dispatchers expect to jump.
    if (key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const now = Date.now();
      const state = typeahead.current;
      state.buffer = now - state.at > TYPEAHEAD_RESET_MS ? key : state.buffer + key;
      state.at = now;
      const query = state.buffer.toLowerCase();
      const count = options.length;
      if (count === 0) return;
      const current = open ? activeIndex : selectedIndex;
      // A repeated single character advances past the current match; a growing
      // buffer re-tests it, so "Ba" doesn't skip the "Battalion" you're spelling.
      const start = (Math.max(current, 0) + (state.buffer.length > 1 ? 0 : 1)) % count;
      for (let n = 0; n < count; n += 1) {
        const index = (start + n) % count;
        const option = options[index];
        if (!option || option.disabled) continue;
        if (!option.label.toLowerCase().startsWith(query)) continue;
        e.preventDefault();
        if (open) setActiveIndex(index);
        else commit(index);
        return;
      }
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-invalid={showInvalid || undefined}
        onKeyDown={onKeyDown}
        onClick={() => (open ? close(false) : openList(selectedIndex >= 0 ? selectedIndex : firstEnabled()))}
        className={cn(
          // `group` is load-bearing: the chevron below is a separate element
          // with its own colour, so it needs `group-disabled:` to follow the
          // trigger into the disabled state. Without it the decoration stays
          // --text-tertiary while the label drops to --text-disabled, and the
          // arrow ends up DARKER than the label it belongs to.
          "group relative inline-flex w-full items-center gap-2 rounded-sm border-chip bg-card",
          "text-left text-control transition duration-fast ease-e911",
          CONTROL_HEIGHT[size],
          size === "tap" ? "px-3" : "px-2.5",
          // NO FOCUS TREATMENT HERE. tokens.css draws ONE two-tone indicator for
          // every focusable thing in the system (`.e911-app :focus-visible`);
          // this trigger carried spec.html's `.input:focus` recipe instead — an
          // outline-suppressing utility plus a border and a 3px shadow re-drawn
          // in --focus-ring. The suppressed outline was the dangerous half: it
          // never actually erased the system indicator, but only because that
          // rule is UNLAYERED and so outranks any utility. Put it in a layer,
          // or let a consuming app declare @layer order differently, and this control
          // loses its keyboard focus ring entirely — no error, no warning, a
          // WCAG 2.4.7 failure whose trigger lives outside this repo.
          //
          // `focus:`, not `focus-visible:`, was the visible half: it matched
          // POINTER focus, so a mouse-clicked trigger painted an indicator the
          // system deliberately withholds. Because focus STAYS on the trigger
          // while the list is open (aria-activedescendant — see the component
          // note), that border was also the only thing marking "open" on the
          // pointer path. That was a side effect, not a designed state: the same
          // two lines were copy-pasted onto DateField's input and FormField's
          // className, neither of which opens anything. An open trigger that
          // should read differently needs its OWN token — --focus-ring on a
          // non-focus state is the confusion SKILL.md rule 7 exists to stop.
          //
          // The removed utility is DESCRIBED here and not quoted verbatim, in
          // all three files. Tailwind v4 scans source as raw text and has no
          // idea what a comment is, so spelling the class name out in prose
          // re-emitted a live `:focus { outline-style: none }` rule into every
          // consuming app's stylesheet from these comments alone — dead, since
          // nothing carries the class, but it is the exact string an audit of
          // the compiled CSS greps for and would then find no source for.
          //
          // KNOWN AND NOT FIXED HERE: the system indicator draws OUTSIDE the
          // border box (outline-offset 2px + a 5px halo, ~7px of reach), and
          // DomainCard sets overflow-hidden. A control sitting flush against a
          // `flush` card's inner edge therefore has its indicator clipped away
          // on that edge — measured on painted pixels, the left edge goes from
          // the old orange border to --border-control with nothing outside it.
          // The removed border-colour half was inside the box and so survived
          // the clip; it was covering for that. An ordinary padded card is fine
          // (p-4 is 16px, more than the 7px reach). The fix belongs in
          // tokens.css (a scoped inset offset) or in DomainCard, not here.
          //
          // Disabled comes from the system now (1.7.0), not from this file.
          // `opacity-45` was one of three treatments three components each
          // invented separately, and it dims the label THROUGH the card, so a
          // long option name on a disabled filter reads as a watermark rather
          // than as text. 1.4.3 exempts a disabled control from the contrast
          // floor; it does not exempt it from being legible enough to say WHICH
          // control is unavailable.
          //
          // Every `disabled:` utility here is (0,2,0) and beats the plain
          // `bg-card` / `border-line-control` / `text-ink` at (0,1,0). That
          // matters: `cn` is a plain join (contract.ts), NOT tailwind-merge, so
          // conflicting utilities both land in the attribute and the cascade —
          // not the order you wrote them in — picks the winner.
          "disabled:cursor-not-allowed",
          "disabled:border-line-disabled disabled:bg-disabled disabled:text-disabled-fg",
          // At `md` the control keeps the system's 32px height, but a finger
          // needs 44px: the pseudo-element extends only the HIT area, so density
          // is unchanged — give stacked selects at least a 12px gap so the areas
          // don't overlap. At `tap` the painted box is already 44px and the
          // extension would push the hit area to 56px and overlap the field
          // above it, so it is dropped rather than stacked on top.
          size === "md" && "before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']",
          // --border-control (1.5.0): the trigger's stroke is what says "field"
          // on a card of the same colour. See tokens.css.
          showInvalid ? "border-bad" : "border-line-control",
          // The line above states the intent; THIS one is what makes it
          // survive a caller. `FormField` hands its child a className carrying
          // its own `border-line-control`, and because `cn` is a plain join
          // both land in the attribute — where `border-line-control` and
          // `border-bad` are each (0,1,0) and the SHEET's order decides. It
          // decides for grey, in both themes (measured), so a supervisor
          // correcting a punch got a red sentence under a form of grey
          // controls. Keying the bad stroke off the attribute assistive tech
          // already reads makes it (0,3,0), which no caller-supplied utility
          // can tie with, and makes the two channels physically the same fact.
          //
          // The `:enabled` half is load-bearing in the other direction: the
          // disabled utilities above are (0,2,0), so without it an escalated
          // bad stroke would outrank them and a disabled field would shout
          // "bad" — a complaint the operator cannot answer, because they
          // cannot type in the field. Disabled still wins, as before.
          "enabled:aria-invalid:border-bad",
          selected ? "text-ink" : "text-faint",
          className
        )}
        {...aria}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? placeholder}</span>
        <span aria-hidden className="text-faint group-disabled:text-disabled-fg">
          <ChevronIcon />
        </span>
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={aria["aria-label"]}
          aria-labelledby={aria["aria-labelledby"]}
          style={layerStyle}
          // THE WHOLE POPOVER, not just the rows. Focus is set as the default
          // action of mousedown, and every `<li>` below suppresses it to keep
          // DOM focus on the trigger — but the container itself did not, so the
          // 4px padding band and the 2px gutters between rows were live surface
          // that moved focus to the nearest focusable ancestor. Measured on
          // /admin/policy, where that ancestor is a TabPanel div: focus landed
          // on it with no visible indicator (mouse focus, so :focus-visible
          // does not match), the listbox stayed open with `aria-expanded=true`,
          // Escape was dead because its handler is on the trigger, ArrowDown
          // scrolled the DOCUMENT instead of the options, and one Tab + Enter
          // later two comboboxes both reported themselves expanded — WCAG 4.1.2.
          // Nothing inside this list is focusable, so there is nothing for the
          // guard to swallow. The per-row handlers are now strictly redundant
          // and stay only so a row keeps its own guarantee if this list ever
          // stops being their parent.
          onMouseDown={(e) => e.preventDefault()}
          className={cn(
            // `gap-0.5` (1.10.0): the rows used to be stacked with literally 0px
            // between them, so a 44px target's miss always landed on a live
            // neighbour rather than on nothing. Two pixels is not a margin of
            // safety, but it is a boundary — and it is what makes the
            // slide-off-and-let-go correction below something an operator can
            // aim at. It costs 2px per row of popover height — and, until the
            // guard above, 14.6% of a two-option popover in surface that
            // answered a press by breaking the control. A gutter between
            // targets is only clearance if landing in it does nothing.
            "z-popover flex flex-col gap-0.5 overflow-y-auto overscroll-contain",
            "rounded-sm border border-line bg-card p-1 shadow-pop"
          )}
        >
          {options.length === 0 ? (
            <li className="px-2.5 py-2 text-ribbon-meta text-faint">No options</li>
          ) : null}
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <li
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                // COMMIT ON THE UP EVENT, never on the down event — WCAG 2.5.2
                // Pointer Cancellation, Level A. This was `onPointerDown`, and
                // a real touch sequence proved what that costs: press on
                // "Premium multiplier on hours worked", slide two rows, lift on
                // "Banked as compensatory time", and the row under the DOWN
                // finger was committed. Slide-off-and-let-go is the one
                // correction every other pointer UI offers, and it is exactly
                // the motion a tremor and an arm's-length reach at a wall
                // tablet both produce. These lists set how a holiday is paid,
                // which shift code applies and which leave kind is filed.
                //
                // Chromium fires `click` on the nearest common ancestor of the
                // down and up targets, so drifting to a neighbour lands the
                // click on the <ul> and nothing commits at all. That is the
                // abort; a clean tap still commits the row it lifted on.
                //
                // preventDefault on MOUSEDOWN is the half of the old handler
                // worth keeping, and it is why the swap is safe: focus is set
                // as the default action of mousedown, so suppressing it keeps
                // DOM focus on the trigger and there is still no blur/focus
                // round-trip through this non-focusable li. dialog.tsx already
                // uses the same mousedown guard for its own drag case.
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  // The old pointerdown preventDefault suppressed the click
                  // outright, so an option press never reached an enclosing
                  // handler (a DataTable row, a card). Preserve that: the fix
                  // is about WHEN the option commits, not about what else the
                  // press is now allowed to trigger.
                  e.stopPropagation();
                  commit(index);
                }}
                onPointerEnter={() => !option.disabled && setActiveIndex(index)}
                className={cn(
                  "flex min-h-tap cursor-pointer items-center gap-2 rounded-sm px-2.5 text-control",
                  // ONE mutually exclusive chain, not four independent flags.
                  // `cn` is a plain join, so two conflicting utilities both land
                  // in the class attribute and the CASCADE decides which one an
                  // operator sees — the same mechanism that let `hover:bg-tint`
                  // paint over the chosen day in DateField. Nothing below
                  // overlaps, so nothing depends on Tailwind's emit order.
                  option.disabled
                    ? // Shared with the trigger, the calendar and Checkbox
                      // (1.7.0). Was `opacity-45`, which faded the label toward
                      // the card instead of colouring it.
                      "cursor-not-allowed text-disabled-fg"
                    : isSelected
                      ? // --surface-selected, NOT --surface-tint (1.7.0). Both
                        // states were tint, so an option the pointer merely
                        // rested on was painted exactly like the one the
                        // operator had chosen — on a list of shift codes that
                        // is a wrong pick waiting to happen. Selected is one
                        // step DARKER than tint in light and one step LIGHTER
                        // in dark, deliberately, so a choice outranks a pointer
                        // that happens to be resting on it. That is also why
                        // hover is NOT re-applied on this branch: the selection
                        // has to survive being hovered.
                        //
                        // Never colour alone — `aria-selected` is on the <li>,
                        // the weight changes, and the check mark below renders.
                        "bg-selected font-semibold text-brand-text"
                      : isActive
                        ? // Hover AND keyboard-active: `onPointerEnter` sets
                          // activeIndex too, so one transient fill covers both.
                          "bg-tint text-ink"
                        : "text-ink"
                )}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                {isSelected ? <CheckIcon /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </>
  );
}
