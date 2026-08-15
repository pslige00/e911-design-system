"use client";

import * as React from "react";
import { Button, cn } from "./core";
import { FormField } from "./data";

/* ------------------------------------------------------------ focus utils */
/**
 * `offsetParent` is the usual cheap visibility probe, but it is null for every
 * `position: fixed` node — which is exactly how Select and DateField render
 * their popovers. `getClientRects()` sees those, so a select opened inside a
 * dialog stays inside the trap instead of falling out of it.
 */
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
  'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function focusableWithin(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0
  );
}

/* ------------------------------------------------------- body scroll lock */
/* Module-level because a DangerDialog can be stacked on a Dialog; the count is
   what stops the inner one's unmount from unlocking the page under the outer. */
let scrollLockCount = 0;
let restoreOverflow = "";
let restorePadRight = "";

function lockBodyScroll(): () => void {
  if (scrollLockCount === 0) {
    const { body } = document;
    restoreOverflow = body.style.overflow;
    restorePadRight = body.style.paddingRight;
    // Replacing the scrollbar's width keeps the ribbon from jumping sideways
    // when the page loses its scrollbar. Zero on overlay-scrollbar tablets.
    const gutter = window.innerWidth - document.documentElement.clientWidth;
    if (gutter > 0) body.style.paddingRight = `${gutter}px`;
    body.style.overflow = "hidden";
  }
  scrollLockCount += 1;
  return () => {
    scrollLockCount -= 1;
    if (scrollLockCount === 0) {
      document.body.style.overflow = restoreOverflow;
      document.body.style.paddingRight = restorePadRight;
    }
  };
}

/* ------------------------------------------------------------------ icons */
function CloseIcon() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/* ----------------------------------------------------------------- Dialog */
export interface DialogProps {
  open: boolean;
  /** Fired by Escape, the close button, and (unless suppressed) the backdrop. */
  onClose: () => void;
  title: string;
  /** One line under the title. Wired to aria-describedby. */
  description?: React.ReactNode;
  /** Right-aligned action row. Confirm last, matching the ribbon's button order. */
  footer?: React.ReactNode;
  /** Off for destructive flows — a mis-tap on a wall tablet shouldn't discard work. */
  dismissOnBackdrop?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: React.ReactNode;
}

const dialogWidth: Record<NonNullable<DialogProps["size"]>, string> = {
  sm: "max-w-[380px]",
  md: "max-w-[520px]",
  lg: "max-w-[720px]",
};

/**
 * Modal dialog. Rendered inline as a `position: fixed` layer rather than a
 * portal: react-dom is only a peer dependency here and the package ships no
 * dependency on its types, so `createPortal` isn't available to us. Fixed
 * positioning escapes the `overflow-hidden` on DomainCard the same way — the
 * one case it can't escape is a transformed ancestor (`translate`, `filter`,
 * `will-change`), which becomes the containing block. Mount dialogs from page
 * level, not from inside the Ribbon's translated action row.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  dismissOnBackdrop = true,
  size = "md",
  className,
  children,
}: DialogProps) {
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const restoreRef = React.useRef<HTMLElement | null>(null);
  const reactId = React.useId();
  const titleId = `${reactId}-title`;
  const descId = `${reactId}-desc`;

  // Capture the trigger before the panel mounts and steals focus, and give it
  // back on close — otherwise the operator's place in the page is gone.
  React.useEffect(() => {
    if (!open) return;
    restoreRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return () => {
      restoreRef.current?.focus();
      restoreRef.current = null;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    return lockBodyScroll();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const first = focusableWithin(panel)[0];
    // The panel itself is the fallback so focus never escapes to the page behind.
    (first ?? panel).focus();
  }, [open]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      // A nested popover (Select, DateField) stops this before it reaches us, so
      // Escape peels one layer at a time instead of closing everything at once.
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const nodes = focusableWithin(panel);
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (!first || !last) {
      e.preventDefault(); // nothing to move to; keep focus on the panel
      return;
    }
    const active = document.activeElement;
    if (e.shiftKey && (active === first || !panel.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-dialog overflow-y-auto",
        "bg-[color-mix(in_srgb,var(--surface-canvas)_80%,transparent)]"
      )}
      onKeyDown={onKeyDown}
    >
      {/* Centring lives on an inner `min-h-full` row rather than on the
          scroller itself: a panel taller than the viewport centred by the
          scroll container has its top edge scrolled out of reach. */}
      <div
        className="flex min-h-full w-full items-center justify-center p-4"
        onMouseDown={(e) => {
          // mousedown, not click: a drag that starts inside the panel and ends
          // on the backdrop (text selection) must not count as a dismiss.
          if (dismissOnBackdrop && e.target === e.currentTarget) onClose();
        }}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          tabIndex={-1}
          className={cn(
            "w-full rounded-lg border border-line bg-card shadow-pop outline-none",
            dialogWidth[size],
            className
          )}
        >
          <div className="flex items-start gap-3 px-5 pb-3 pt-4">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="font-display text-h2 tracking-[-0.012em]">
                {title}
              </h2>
              {description ? (
                <p id={descId} className="mt-1 text-[12.5px] text-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={cn(
                "-mr-1.5 -mt-1 grid size-tap shrink-0 place-items-center rounded-sm",
                "text-faint transition duration-fast ease-e911 hover:bg-tint hover:text-ink"
              )}
            >
              <CloseIcon />
            </button>
          </div>
          <div className="px-5 pb-5 text-body">{children}</div>
          {footer ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ DangerDialog */
export interface DangerDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  /** The word the operator has to type out before Confirm arms, e.g. a unit ID. */
  confirmWord: string;
  confirmLabel?: string;
  onConfirm: () => void;
  /** Disables Confirm while the mutation is in flight. */
  busy?: boolean;
  children?: React.ReactNode;
}

/**
 * Destructive confirmation. The typed word is the whole point: it converts an
 * accidental tap into a deliberate act, which is why the backdrop does not
 * dismiss and the confirm button starts disabled.
 */
export function DangerDialog({
  open,
  onClose,
  title,
  description,
  confirmWord,
  confirmLabel = "Delete",
  onConfirm,
  busy = false,
  children,
}: DangerDialogProps) {
  const [typed, setTyped] = React.useState("");
  const fieldId = `${React.useId()}-confirm`;

  // Reopening must not inherit the last attempt's armed state.
  React.useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  // Trimmed + case-insensitive: the intent is proven by typing the word, and a
  // stray capital on a tablet keyboard is not evidence of a mistake.
  const armed = typed.trim().toLowerCase() === confirmWord.trim().toLowerCase();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      dismissOnBackdrop={false}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" disabled={!armed || busy} onClick={onConfirm}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      <form
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (armed && !busy) onConfirm();
        }}
      >
        <FormField
          id={fieldId}
          label="Type the word to confirm"
          hint={`Enter ${confirmWord} exactly.`}
        >
          {({ className, ...field }) => (
            <input
              {...field}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              // Mono because the operator is matching a literal string character
              // for character — the same reason IDs and cert codes are mono.
              className={cn(className, "w-full font-mono")}
            />
          )}
        </FormField>
      </form>
    </Dialog>
  );
}
