"use client";

import * as React from "react";
import { cn } from "./core";
import { useAnchoredLayer, useDismissOnOutsidePress } from "./select";

/* ==========================================================================
   CALENDAR MATH — deliberately Date-free.

   `new Date("2026-08-14")` is parsed as UTC midnight, and `.toISOString()`
   converts back through UTC. Every timezone west of Greenwich — which is all
   of them here — reads that back as the 13th. A shift roster off by one day is
   a real incident, so this component never constructs a Date from a string and
   never formats one to a string. All arithmetic runs on {y, m, d} integers via
   a proleptic Gregorian day count, and the only Date we touch is `new Date()`
   read through the LOCAL getters to find out what today is.
   ========================================================================== */

interface Ymd {
  y: number;
  m: number; // 1-12
  d: number;
}

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function daysInMonth(y: number, m: number): number {
  if (m === 2) return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28;
  return m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 31;
}

/** Days since 1970-01-01, proleptic Gregorian (Howard Hinnant's civil algorithm). */
function toDayNumber({ y, m, d }: Ymd): number {
  const shifted = m <= 2 ? y - 1 : y;
  const era = Math.floor(shifted / 400);
  const yearOfEra = shifted - era * 400;
  const dayOfYear = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

function fromDayNumber(days: number): Ymd {
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365
  );
  const year = yearOfEra + era * 400;
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const mp = Math.floor((5 * dayOfYear + 2) / 153);
  const d = dayOfYear - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return { y: m <= 2 ? year + 1 : year, m, d };
}

/** 0 = Sunday. 1970-01-01 (day 0) was a Thursday, hence the +4. */
function weekday(v: Ymd): number {
  return (((toDayNumber(v) + 4) % 7) + 7) % 7;
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}

export function formatIsoDate(v: Ymd): string {
  return `${pad(v.y, 4)}-${pad(v.m, 2)}-${pad(v.d, 2)}`;
}

/** Strict: rejects "2026-02-30" as well as anything that isn't YYYY-MM-DD. */
export function parseIsoDate(value: string): Ymd | null {
  const match = ISO_RE.exec(value.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > daysInMonth(y, m)) return null;
  return { y, m, d };
}

function addDays(v: Ymd, n: number): Ymd {
  return fromDayNumber(toDayNumber(v) + n);
}

function addMonths(v: Ymd, n: number): Ymd {
  const total = v.y * 12 + (v.m - 1) + n;
  const y = Math.floor(total / 12);
  const m = (((total % 12) + 12) % 12) + 1;
  return { y, m, d: Math.min(v.d, daysInMonth(y, m)) };
}

/**
 * Today in the operator's own timezone — the only sanctioned use of Date in
 * this file, and only through the LOCAL getters. `getUTCDate()` here would
 * reintroduce the exact off-by-one this module exists to prevent.
 */
function todayYmd(): Ymd {
  const now = new Date();
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

export function todayIsoDate(): string {
  return formatIsoDate(todayYmd());
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function monthLabel(y: number, m: number): string {
  return `${MONTH_NAMES[m - 1] ?? ""} ${y}`;
}

/* ------------------------------------------------------------------ icons */
function CalendarIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.25" y="3.25" width="11.5" height="10.5" rx="2" />
      <path d="M2.25 6.5h11.5M5.5 2v2.5M10.5 2v2.5" />
    </svg>
  );
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M9.5 4L6 8l3.5 4" : "M6.5 4L10 8l-3.5 4"} />
    </svg>
  );
}

/* -------------------------------------------------------------- DateField */
export interface DateFieldProps {
  id?: string;
  /** `YYYY-MM-DD`, or "" for empty. Never a Date — see the header note. */
  value: string;
  /** Emits `YYYY-MM-DD`, or "" when the field is cleared. */
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  /** Extra blackout days (holidays, closed shifts). Receives `YYYY-MM-DD`. */
  isDateDisabled?: (iso: string) => boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

export function DateField({
  id,
  value,
  onChange,
  min,
  max,
  isDateDisabled,
  disabled = false,
  invalid = false,
  className,
  ...aria
}: DateFieldProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [cursor, setCursor] = React.useState<string>(value || todayIsoDate());
  // Set only by grid interaction, so tabbing to the month buttons doesn't get
  // yanked back into the day grid on the next render.
  const focusGrid = React.useRef(false);

  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const gridRef = React.useRef<HTMLDivElement | null>(null);

  const reactId = React.useId();
  const inputId = id ?? `${reactId}-input`;
  const gridLabelId = `${reactId}-month`;

  const layerStyle = useAnchoredLayer(open, wrapRef, popoverRef);
  useDismissOnOutsidePress(open, [wrapRef, popoverRef], () => setOpen(false));

  // The input is the source of truth while it has focus; otherwise the prop is.
  React.useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(value);
  }, [value]);

  const dayDisabled = React.useCallback(
    (iso: string): boolean => {
      // Lexicographic comparison is exactly correct for zero-padded ISO dates —
      // which is half the reason the value is carried as a string.
      if (min && iso < min) return true;
      if (max && iso > max) return true;
      return isDateDisabled?.(iso) ?? false;
    },
    [min, max, isDateDisabled]
  );

  const cursorYmd = parseIsoDate(cursor) ?? todayYmd();
  const viewY = cursorYmd.y;
  const viewM = cursorYmd.m;

  const openPicker = () => {
    if (disabled) return;
    const start = parseIsoDate(value) ? value : todayIsoDate();
    setCursor(start);
    focusGrid.current = true;
    setOpen(true);
  };

  const closePicker = (refocus: boolean) => {
    setOpen(false);
    focusGrid.current = false;
    if (refocus) inputRef.current?.focus();
  };

  const pick = (iso: string) => {
    if (dayDisabled(iso)) return;
    setDraft(iso);
    onChange(iso);
    closePicker(true);
  };

  const commitDraft = () => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      if (value !== "") onChange("");
      return;
    }
    const parsed = parseIsoDate(trimmed);
    // An unparseable draft snaps back rather than emitting garbage upward; the
    // field is the wrong place to invent a date the operator didn't type.
    if (!parsed) {
      setDraft(value);
      return;
    }
    const iso = formatIsoDate(parsed);
    setDraft(iso);
    if (iso !== value && !dayDisabled(iso)) onChange(iso);
    else if (dayDisabled(iso)) setDraft(value);
  };

  // Move DOM focus onto the cursor cell after the grid re-renders around it.
  React.useEffect(() => {
    if (!open || !focusGrid.current) return;
    const cell = gridRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${cursor}"]`);
    cell?.focus();
  }, [open, cursor]);

  const onGridKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const current = parseIsoDate(cursor);
    if (!current) return;
    let next: Ymd | null = null;
    switch (e.key) {
      case "ArrowLeft": next = addDays(current, -1); break;
      case "ArrowRight": next = addDays(current, 1); break;
      case "ArrowUp": next = addDays(current, -7); break;
      case "ArrowDown": next = addDays(current, 7); break;
      case "Home": next = addDays(current, -weekday(current)); break;
      case "End": next = addDays(current, 6 - weekday(current)); break;
      case "PageUp": next = addMonths(current, e.shiftKey ? -12 : -1); break;
      case "PageDown": next = addMonths(current, e.shiftKey ? 12 : 1); break;
      case "Enter":
      case " ":
        e.preventDefault();
        pick(cursor);
        return;
      default:
        return;
    }
    e.preventDefault();
    focusGrid.current = true;
    setCursor(formatIsoDate(next));
  };

  /* Six rows always: a five-row month next to a six-row one would resize the
     popover under the pointer mid-selection. */
  const gridStart = addDays({ y: viewY, m: viewM, d: 1 }, -weekday({ y: viewY, m: viewM, d: 1 }));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = todayIsoDate();

  const shiftMonth = (delta: number) => {
    const current = parseIsoDate(cursor);
    if (!current) return;
    focusGrid.current = false; // keep focus on the nav button that was pressed
    setCursor(formatIsoDate(addMonths(current, delta)));
  };

  return (
    <div
      ref={wrapRef}
      className={cn("relative inline-flex w-full max-w-[220px]", className)}
      onBlur={(e) => {
        // Non-modal popover: it closes when focus genuinely leaves the field,
        // rather than trapping the operator inside a calendar.
        if (!open) return;
        const next = e.relatedTarget;
        if (next instanceof Node && (wrapRef.current?.contains(next) || popoverRef.current?.contains(next))) return;
        setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation(); // an enclosing Dialog stays open
          e.preventDefault();
          closePicker(true);
        }
      }}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        inputMode="numeric"
        value={draft}
        disabled={disabled}
        placeholder="YYYY-MM-DD"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={invalid || undefined}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitDraft();
          }
          if (e.key === "ArrowDown" && e.altKey) {
            e.preventDefault();
            openPicker();
          }
        }}
        className={cn(
          "h-ctl w-full rounded-sm border-chip bg-card pl-2.5 pr-tap text-[13px] text-ink",
          // Dates are mono + tabular everywhere in this system, including while
          // they're being typed — the columns have to stay put.
          "font-mono tabular-nums",
          "focus:border-[var(--focus-ring)] focus:outline-none",
          "focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--focus-ring)_20%,transparent)]",
          "disabled:cursor-not-allowed disabled:opacity-45",
          invalid ? "border-bad" : "border-line"
        )}
        {...aria}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? closePicker(true) : openPicker())}
        aria-label="Choose date"
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "absolute right-0 top-1/2 grid size-tap -translate-y-1/2 place-items-center",
          "rounded-sm text-faint transition duration-fast ease-e911 hover:text-ink",
          "disabled:cursor-not-allowed disabled:opacity-45"
        )}
      >
        <CalendarIcon />
      </button>

      {open ? (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label="Choose date"
          style={layerStyle}
          className="z-popover rounded-md border border-line bg-card p-2 shadow-pop"
        >
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
              className="grid size-tap place-items-center rounded-sm text-muted transition duration-fast ease-e911 hover:bg-tint hover:text-ink"
            >
              <ChevronIcon dir="left" />
            </button>
            <div
              id={gridLabelId}
              aria-live="polite"
              className="flex-1 text-center font-display text-h3 tracking-[-0.01em]"
            >
              {monthLabel(viewY, viewM)}
            </div>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="grid size-tap place-items-center rounded-sm text-muted transition duration-fast ease-e911 hover:bg-tint hover:text-ink"
            >
              <ChevronIcon dir="right" />
            </button>
          </div>

          <div ref={gridRef} role="grid" aria-labelledby={gridLabelId} onKeyDown={onGridKeyDown}>
            <div role="row" className="grid grid-cols-7">
              {WEEKDAY_NAMES.map((name) => (
                <div
                  key={name}
                  role="columnheader"
                  // Two letters fit the 44px column; the full name stays in the
                  // a11y tree so "Th" isn't read out as a word.
                  aria-label={name}
                  className="grid h-7 place-items-center text-label font-semibold uppercase tracking-[0.05em] text-faint"
                >
                  <span aria-hidden>{name.slice(0, 2)}</span>
                </div>
              ))}
            </div>
            {[0, 1, 2, 3, 4, 5].map((week) => (
              <div key={week} role="row" className="grid grid-cols-7">
                {cells.slice(week * 7, week * 7 + 7).map((cell) => {
                  const iso = formatIsoDate(cell);
                  const outside = cell.m !== viewM;
                  const isSelected = iso === value;
                  const isCursor = iso === cursor;
                  const off = dayDisabled(iso);
                  return (
                    <div role="gridcell" key={iso} aria-selected={isSelected}>
                      <button
                        type="button"
                        data-iso={iso}
                        // Roving tabindex: the grid is one tab stop and the
                        // arrow keys walk it, per the APG grid pattern.
                        tabIndex={isCursor ? 0 : -1}
                        aria-disabled={off || undefined}
                        aria-current={iso === today ? "date" : undefined}
                        aria-label={`${cell.d} ${MONTH_NAMES[cell.m - 1] ?? ""} ${cell.y}`}
                        onClick={() => pick(iso)}
                        className={cn(
                          "grid size-tap place-items-center rounded-sm font-mono text-[12px] tabular-nums",
                          "transition duration-fast ease-e911",
                          off && "cursor-not-allowed text-faint opacity-45",
                          !off && outside && "text-faint hover:bg-tint",
                          !off && !outside && "text-ink hover:bg-tint",
                          isSelected && "border-chip border-action bg-brand-soft font-semibold text-brand-text",
                          // Today is marked with an underline, not a fill — a
                          // filled today would be indistinguishable from the
                          // selected day at a glance across the room.
                          !isSelected &&
                            iso === today &&
                            "font-semibold underline decoration-2 underline-offset-4"
                        )}
                      >
                        {cell.d}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
