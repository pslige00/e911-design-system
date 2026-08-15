"use client";

import * as React from "react";
import { cn } from "./core";

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M9.5 4L6 8l3.5 4" : "M6.5 4L10 8l-3.5 4"} />
    </svg>
  );
}

type Slot = number | "gap";

/**
 * First page, last page, a window around the current one, ellipses for the
 * rest. The window is a fixed width so the control doesn't reflow under the
 * finger as pages change.
 */
export function paginationSlots(page: number, pageCount: number, siblings: number): Slot[] {
  if (pageCount <= 1) return pageCount === 1 ? [1] : [];
  const windowWidth = siblings * 2 + 5; // first + last + current + 2 siblings + 2 gaps
  if (pageCount <= windowWidth) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const left = Math.max(2, page - siblings);
  const right = Math.min(pageCount - 1, page + siblings);
  const slots: Slot[] = [1];

  if (left > 2) slots.push("gap");
  else for (let i = 2; i < left; i += 1) slots.push(i);

  for (let i = left; i <= right; i += 1) slots.push(i);

  if (right < pageCount - 1) slots.push("gap");
  else for (let i = right + 1; i < pageCount; i += 1) slots.push(i);

  slots.push(pageCount);
  return slots;
}

export interface PaginationProps {
  /** 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
  "aria-label"?: string;
}

/**
 * Page numbers share the filter chip's visual language (1.5px border, 8px
 * radius, brand-soft when active) because they are the same kind of thing: a
 * small stateful selector, not a command button.
 *
 * Everything here is a real 44px target rather than a 32px control with an
 * overhanging hit area — the buttons sit shoulder to shoulder, and overlapping
 * hit areas would land the operator on page 7 when they aimed at page 6.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  siblingCount = 1,
  className,
  ...aria
}: PaginationProps) {
  if (pageCount <= 1) return null;
  const slots = paginationSlots(page, pageCount, siblingCount);
  const atStart = page <= 1;
  const atEnd = page >= pageCount;

  const stepClass = cn(
    "inline-flex h-tap items-center gap-1 rounded-sm border-chip border-line bg-card px-2.5",
    "text-[12.5px] font-medium text-ink transition duration-fast ease-e911",
    "hover:bg-tint disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-card"
  );

  return (
    <nav aria-label={aria["aria-label"] ?? "Pagination"} className={cn("flex", className)}>
      <ul className="flex list-none items-center gap-1">
        <li>
          <button
            type="button"
            disabled={atStart}
            onClick={() => onPageChange(page - 1)}
            className={stepClass}
          >
            <ChevronIcon dir="left" />
            Prev
          </button>
        </li>

        {slots.map((slot, index) =>
          slot === "gap" ? (
            <li
              key={`gap-${index}`}
              aria-hidden
              className="grid h-tap w-6 place-items-center text-faint"
            >
              …
            </li>
          ) : (
            <li key={slot}>
              <button
                type="button"
                // aria-current is what makes this the *current* page rather than
                // a pressed button; the border and fill alone say nothing.
                aria-current={slot === page ? "page" : undefined}
                aria-label={`Page ${slot}`}
                onClick={() => onPageChange(slot)}
                className={cn(
                  "grid h-tap min-w-tap place-items-center rounded-sm border-chip px-2",
                  // Mono + tabular so the numbers hold their column as they
                  // widen from 9 to 10 to 100.
                  "font-mono text-[12.5px] tabular-nums transition duration-fast ease-e911",
                  slot === page
                    ? "border-action bg-brand-soft font-semibold text-brand-text"
                    : "border-line bg-card text-muted hover:bg-tint hover:text-ink"
                )}
              >
                {slot}
              </button>
            </li>
          )
        )}

        <li>
          <button
            type="button"
            disabled={atEnd}
            onClick={() => onPageChange(page + 1)}
            className={stepClass}
          >
            Next
            <ChevronIcon dir="right" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
