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

  const move = (from: number, delta: number) => {
    const count = items.length;
    if (count === 0) return;
    let next = from;
    for (let i = 0; i < count; i += 1) {
      next = (next + delta + count) % count;
      const item = items[next];
      if (item && !item.disabled) {
        tabRefs.current[next]?.focus();
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
    tabRefs.current[index]?.focus();
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
        className={cn("flex items-stretch gap-1 border-b border-line", className)}
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
