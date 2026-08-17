"use client";

import * as React from "react";
import { cn } from "./core";

interface TabsContextValue {
  base: string;
  activeId: string;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

/* Tab and panel ids have to agree across two components, so they're derived
   rather than passed — a mismatched aria-controls is invisible until a screen
   reader hits it. */
const tabDomId = (base: string, id: string) => `${base}-tab-${id}`;
const panelDomId = (base: string, id: string) => `${base}-panel-${id}`;

export interface TabItem {
  id: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  /** Panels. Render <TabPanel> children here so they inherit the id namespace. */
  children?: React.ReactNode;
  /** Required unless the tablist is the only labelled thing on the page. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
}

/**
 * Section tabs. The active tab is marked with an inset accent rule sitting on
 * the tablist's baseline, not a filled pill: in this system a filled shape
 * reads as a button you can press, and the brand-soft fill is already spoken
 * for by the rail's active destination and by filter chips.
 *
 * Selection follows focus (automatic activation), which is the APG default for
 * panels whose contents are already in the DOM.
 */
export function Tabs({
  items,
  activeId,
  onChange,
  children,
  className,
  ...aria
}: TabsProps) {
  const base = React.useId();
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const stripRef = React.useRef<HTMLDivElement | null>(null);

  /* Which edge of the strip has tabs hidden behind it, written straight to the
     DOM rather than held in state: this runs on every scroll frame, and through
     state it would re-render the whole tablist while a thumb is still moving.
     The `data-overflow` variants on the strip's className read it. */
  const syncEdges = React.useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    // A pixel of slack on both tests: scrollLeft is fractional at a device
    // pixel ratio of 2 and the end of the strip lands a fraction short of
    // scrollWidth - clientWidth, which would otherwise leave the end fade
    // painted over a strip that has nothing left to show.
    const fromStart = strip.scrollLeft > 1;
    const toEnd = strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 1;
    strip.dataset.overflow =
      fromStart && toEnd ? "both" : fromStart ? "start" : toEnd ? "end" : "none";
  }, []);

  React.useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    syncEdges();
    // The strip's own box changes on resize; its CONTENT width changes when a
    // label does — a late font, a longer word in an updated items prop. The
    // children are observed too because a fade that is wrong after a font swap
    // is wrong in the direction that hides tabs, and nothing reports it.
    const observer = new ResizeObserver(syncEdges);
    observer.observe(strip);
    for (const child of Array.from(strip.children)) observer.observe(child);
    strip.addEventListener("scroll", syncEdges, { passive: true });
    return () => {
      observer.disconnect();
      strip.removeEventListener("scroll", syncEdges);
    };
  }, [syncEdges, items]);

  /* Focus a tab and drag the strip along to it. The scroll is not decoration:
     without it the strip's own overflow simply relocates the failure — the
     document stops widening (1.4.10) but four ArrowRight presses still park
     focus on a tab outside the strip's visible box (2.4.11), which is exactly
     what /schedule at 320px did before the strip scrolled. Explicit rather than
     trusting focus() to scroll an ancestor, because that behaviour is the UA's
     to choose and it ignores the scroll-padding this strip declares. */
  const focusTab = (index: number) => {
    const node = tabRefs.current[index];
    if (!node) return;
    node.focus();
    node.scrollIntoView({ inline: "nearest", block: "nearest" });
  };

  const move = (from: number, delta: number) => {
    const count = items.length;
    if (count === 0) return;
    let next = from;
    for (let i = 0; i < count; i += 1) {
      next = (next + delta + count) % count;
      const item = items[next];
      if (item && !item.disabled) {
        focusTab(next);
        onChange(item.id);
        return;
      }
    }
  };

  const edge = (fromEnd: boolean) => {
    const order = items.map((_, i) => i);
    const index = (fromEnd ? order.reverse() : order).find((i) => !items[i]?.disabled);
    if (index === undefined) return;
    const item = items[index];
    if (!item) return;
    focusTab(index);
    onChange(item.id);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        move(index, 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        move(index, -1);
        break;
      case "Home":
        e.preventDefault();
        edge(false);
        break;
      case "End":
        e.preventDefault();
        edge(true);
        break;
      default:
        break;
    }
  };

  return (
    <TabsContext.Provider value={{ base, activeId }}>
      <div
        role="tablist"
        ref={stripRef}
        className={cn(
          "flex items-stretch gap-1 border-b border-line",
          /* The strip scrolls sideways. With the default `overflow-x: visible`
             the buttons escaped the strip's box instead: /schedule's five tabs
             squeezed themselves onto two lines, still needed 390px against a
             288px box, and widened the DOCUMENT to 407px on a 320px screen —
             where nothing could scroll it back. `Trades` and `Open shifts` were
             unreachable by pointer, touch, keyboard and every scroll API
             (WCAG 1.4.10).
             `min-w-0` is what lets the strip shrink at all when a consumer
             drops <Tabs> into a flex row. `overscroll-x-contain` stops a flick
             that reaches the end from chaining into the browser's back
             gesture, which on a phone loses the page.

             Deliberately NOT `overflow-y: hidden`: the strip's scrollable
             overflow is 1px taller than its box because the active tab's rule
             sits astride the strip's bottom border, and clipping it would halve
             the one mark that says which tab you are on. 1px of hidden vertical
             scroll costs nothing; the indicator does not. */
          "min-w-0 overflow-x-auto overscroll-x-contain",
          /* The rail (shell.tsx) is the only other place this system hides a
             scrollbar, for the same reason: a classic one would take ~15px of
             the strip's 44px height on the platforms that still draw them, and
             the affordance here is the edge fade below. Standard property only —
             ::-webkit-scrollbar redraws the widget, which tokens/SKILL.md
             rules out. */
          "[scrollbar-width:none]",
          /* Proximity rather than mandatory: a strip parked mid-label reads as
             broken, but mandatory snapping fights a deliberate small nudge. The
             scroll-padding is what keeps a snapped — or a focus-scrolled — tab
             clear of the fade; without it, focus scrolls a tab to precisely the
             edge the gradient is dimming. */
          "[scroll-snap-type:x_proximity] [scroll-padding-inline:1.5rem]",
          /* The affordance that there is more, on whichever side there is more.
             Conditional on measured overflow (see syncEdges) because an
             unconditional fade dims the last tab of every tablist that fits,
             which is most of them on a desk machine. `black` is an alpha
             channel here, not a colour: a mask reads only alpha, so these
             decide nothing about how anything looks. */
          "data-[overflow=start]:[mask-image:linear-gradient(to_right,transparent,black_1.5rem)]",
          "data-[overflow=end]:[mask-image:linear-gradient(to_right,black_calc(100%_-_1.5rem),transparent)]",
          "data-[overflow=both]:[mask-image:linear-gradient(to_right,transparent,black_1.5rem,black_calc(100%_-_1.5rem),transparent)]",
          className
        )}
        {...aria}
      >
        {items.map((item, index) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={tabDomId(base, item.id)}
              aria-selected={active}
              aria-controls={panelDomId(base, item.id)}
              disabled={item.disabled}
              // Roving tabindex: one tab stop for the whole set, arrows move
              // within it. Without this every tab is a Tab press of its own.
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(item.id)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                "relative min-h-tap px-3 text-body transition duration-fast ease-e911",
                // Snap target for the strip's proximity snapping: a scroll that
                // comes to rest between two tabs settles on this edge instead
                // of leaving a label cut down the middle.
                "[scroll-snap-align:start]",
                // A flex item shrinks to its min-content size by default, and
                // at 320px that was squeezing three of /schedule's five labels
                // onto two lines — and STILL overflowing (390px of tabs into a
                // 288px box), so the squeeze bought nothing and cost legibility.
                // Once the strip scrolls, a tab keeping its own width is what
                // makes the snap points land on labels.
                "shrink-0",
                "disabled:cursor-not-allowed disabled:opacity-45",
                active
                  ? "font-semibold text-brand-text"
                  : "font-medium text-muted hover:text-ink",
                // The rule overlaps the tablist's own 1px border and is inset
                // from the label so it reads as an underline, not a full-width tab.
                active &&
                  "after:absolute after:inset-x-2 after:-bottom-px after:h-[2px] after:rounded-pill after:bg-action after:content-['']"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {children}
    </TabsContext.Provider>
  );
}

export interface TabPanelProps {
  /** Must match the TabItem id it belongs to. */
  tabId: string;
  children?: React.ReactNode;
  className?: string;
}

export function TabPanel({ tabId, children, className }: TabPanelProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("<TabPanel> must be rendered inside <Tabs>.");
  const active = ctx.activeId === tabId;
  return (
    <div
      role="tabpanel"
      id={panelDomId(ctx.base, tabId)}
      aria-labelledby={tabDomId(ctx.base, tabId)}
      hidden={!active}
      // Focusable so Tab out of the tablist lands on the panel; the panel body
      // is often a table with no focusable content of its own.
      tabIndex={active ? 0 : -1}
      className={cn("pt-4 outline-none", className)}
    >
      {active ? children : null}
    </div>
  );
}
