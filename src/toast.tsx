"use client";

import * as React from "react";
import { StatusTag, cn, type Tone } from "./core";

/** Long enough to read two lines at a console you're not staring at. */
const DEFAULT_DURATION_MS = 6000;

export interface ToastOptions {
  tone: Tone;
  /**
   * The status word — "Saved", "Overdue", "Failed". Required, not optional:
   * status in this system is pill + dot + word, and a toast that leans on its
   * tint alone is unreadable to a third of a shift rotation.
   */
  word: string;
  message: React.ReactNode;
  /** ms; 0 pins the toast until it's dismissed by hand. */
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastRecord extends ToastOptions {
  id: string;
}

/**
 * One toast's text, as the screen reader gets it. `key` is the provider's
 * sequence number and is load-bearing: React reuses a child whose key has not
 * changed, so the same message twice in a row ("Failed", "Failed") would be no
 * DOM mutation at all and the second one would pass in silence. A new key
 * replaces the node, which is a change inside the live region and announces.
 */
interface Announcement {
  key: number;
  word: string;
  message: React.ReactNode;
}

interface ToastApi {
  /** Returns the id so a long-running task can dismiss its own toast. */
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast() requires a <ToastProvider> above it.");
  return ctx;
}

/* ------------------------------------------------------------------- icon */
function CloseIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/* ------------------------------------------------------------ ToastProvider */
export interface ToastProviderProps {
  children: React.ReactNode;
  /** Oldest toasts drop off past this; a stack taller than this blocks content. */
  max?: number;
}

/**
 * Mount once, at app root — the viewport is `position: fixed`, so it must not
 * sit under a transformed ancestor (see the note in select.tsx). The provider
 * lives outside any Dialog's stacking context and z-toast outranks z-dialog,
 * so a toast confirming a dialog action is visible over that dialog.
 */
export function ToastProvider({ children, max = 4 }: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);
  /* Two slots, not one, so a routine "Saved" landing a second after a failure
     does not blank the assertive region before the reader has finished it. */
  const [polite, setPolite] = React.useState<Announcement | null>(null);
  const [assertive, setAssertive] = React.useState<Announcement | null>(null);
  const seq = React.useRef(0);

  const dismiss = React.useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (options: ToastOptions) => {
      seq.current += 1;
      const id = `toast-${seq.current}`;
      setToasts((list) => [...list, { ...options, id }].slice(-max));
      // `bad` is an interruption — a failed dispatch write can't wait for the
      // reader to finish the current phrase. Every other tone is polite, and
      // the test is deliberately `=== "bad"` rather than a per-tone map: `Tone`
      // widened to five in 1.7.0, and a map would have been the thing that
      // needed editing (or, more likely, didn't) when `info` and `neutral`
      // arrived. Written this way a sixth tone announces politely by default —
      // the safe end of the choice. An assertive region on a routine "Saved"
      // cuts off whatever the operator was already being read.
      const announcement = { key: seq.current, word: options.word, message: options.message };
      if (options.tone === "bad") setAssertive(announcement);
      else setPolite(announcement);
      return id;
    },
    [max]
  );

  // Identity has to be stable or every consumer of useToast() re-renders on
  // each toast, which is most of the app.
  const api = React.useMemo<ToastApi>(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className={cn(
          "pointer-events-none fixed bottom-4 right-4 z-toast flex w-[min(360px,calc(100vw-2rem))]",
          "flex-col gap-2"
        )}
      >
        {/* BOTH REGIONS ARE MOUNTED FROM FIRST RENDER AND STAY EMPTY until
            there is something to say. This is the whole point of them: a live
            region that appears at the same instant it gains its text is not
            reliably announced — NVDA and JAWS announce a change of content
            inside a region that was ALREADY THERE. The role used to live on the
            card, which is created already populated, so four of the five tones
            were a coin toss. (TimeSweep learned this in
            src/app/(app)/now/board-refresh.tsx and the system's own toast went
            on doing the thing that app had fixed.)

            They are also OUTSIDE the card on purpose: the card is torn down when
            the toast expires, and a region that is removed and rebuilt per
            message is the same defect wearing a different hat. */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {polite ? (
            <p key={polite.key}>
              {polite.word}. {polite.message}
            </p>
          ) : null}
        </div>
        <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
          {assertive ? (
            <p key={assertive.key}>
              {assertive.word}. {assertive.message}
            </p>
          ) : null}
        </div>
        {toasts.map((t) => (
          <ToastCard key={t.id} record={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* --------------------------------------------------------------- ToastCard */
function ToastCard({ record, onDismiss }: { record: ToastRecord; onDismiss: () => void }) {
  const duration = record.duration ?? DEFAULT_DURATION_MS;
  const [paused, setPaused] = React.useState(false);
  const remaining = React.useRef(duration);
  const dismissRef = React.useRef(onDismiss);
  dismissRef.current = onDismiss;

  // The timer is torn down and rebuilt around each pause, banking the time that
  // already elapsed. Without that, hovering to read a message would either
  // restart the countdown or not stop it at all.
  React.useEffect(() => {
    if (duration <= 0 || paused) return;
    const startedAt = Date.now();
    const handle = window.setTimeout(() => dismissRef.current(), remaining.current);
    return () => {
      window.clearTimeout(handle);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt));
    };
  }, [paused, duration]);

  return (
    <div
      // No live-region role here any more; it moved to the two permanent
      // regions in ToastProvider, which is the only arrangement that is
      // actually announced. See the comment there before putting one back.
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      // Plain card, no tone-tinted edge: the 4px colored edge is spoken for by
      // DomainCard's domain hue, and reusing it for status would put two
      // different meanings on one shape. The StatusTag carries the tone.
      className="pointer-events-auto rounded-md border border-line bg-card p-3 shadow-pop"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {/* The word and the message are hidden from assistive tech HERE, and
              only here: the live region above has already said both, and a
              reader browsing the page should not meet them a second time.
              Scoped to the text rather than put on the card — an aria-hidden
              card would take the Undo and Dismiss buttons out of the
              accessibility tree with it, which is both an axe
              `aria-hidden-focus` violation and a toast a blind operator cannot
              dismiss or undo. */}
          <div aria-hidden="true">
            <StatusTag tone={record.tone}>{record.word}</StatusTag>
            <p className="mt-1.5 text-ribbon-meta text-ink">{record.message}</p>
          </div>
          {record.action ? (
            <button
              type="button"
              onClick={() => {
                record.action?.onClick();
                onDismiss();
              }}
              className={cn(
                "relative mt-2 h-ctl-sm rounded-sm border-chip border-line bg-card px-2.5",
                "text-ui-sm font-semibold text-ink transition duration-fast ease-e911 hover:bg-tint",
                // 28px painted, 44px reachable — nothing sits directly above or
                // below it inside the toast, so the overhang is free.
                "before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']"
              )}
            >
              {record.action.label}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className={cn(
            "-mr-1 -mt-1 grid size-tap shrink-0 place-items-center rounded-sm text-faint",
            "transition duration-fast ease-e911 hover:bg-tint hover:text-ink"
          )}
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
