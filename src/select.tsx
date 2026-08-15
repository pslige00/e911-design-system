"use client";

import * as React from "react";
import { cn } from "./core";

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
    const layer = layerRef.current;
    const ro = layer ? new ResizeObserver(() => place()) : null;
    if (layer && ro) ro.observe(layer);

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
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
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
  className,
  ...aria
}: SelectProps<T>) {
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
        aria-invalid={invalid || undefined}
        onKeyDown={onKeyDown}
        onClick={() => (open ? close(false) : openList(selectedIndex >= 0 ? selectedIndex : firstEnabled()))}
        className={cn(
          "relative inline-flex h-ctl w-full items-center gap-2 rounded-sm border-chip bg-card",
          "px-2.5 text-left text-[13px] transition duration-fast ease-e911",
          "focus:border-[var(--focus-ring)] focus:outline-none",
          "focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--focus-ring)_20%,transparent)]",
          "disabled:cursor-not-allowed disabled:opacity-45",
          // The control keeps the system's 32px height, but a finger needs 44px.
          // The pseudo-element extends only the hit area, so density is unchanged
          // — give stacked selects at least a 12px gap so the areas don't overlap.
          "before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']",
          invalid ? "border-bad" : "border-line",
          selected ? "text-ink" : "text-faint",
          className
        )}
        {...aria}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label ?? placeholder}</span>
        <span aria-hidden className="text-faint">
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
          className={cn(
            "z-popover overflow-y-auto overscroll-contain rounded-sm border border-line",
            "bg-card p-1 shadow-pop"
          )}
        >
          {options.length === 0 ? (
            <li className="px-2.5 py-2 text-[12.5px] text-faint">No options</li>
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
                // pointerdown, not click: the trigger keeps DOM focus, and a
                // click would first fire a blur/focus round-trip through the li.
                onPointerDown={(e) => {
                  e.preventDefault();
                  commit(index);
                }}
                onPointerEnter={() => !option.disabled && setActiveIndex(index)}
                className={cn(
                  "flex min-h-tap cursor-pointer items-center gap-2 rounded-sm px-2.5 text-[13px]",
                  option.disabled && "cursor-not-allowed opacity-45",
                  isActive && !option.disabled && "bg-tint",
                  isSelected ? "font-semibold text-brand-text" : "text-ink"
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
