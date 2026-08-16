"use client";

import * as React from "react";
import { cn, type ControlSize } from "./core";

/* ============================================================================
   Checkbox + Radio — the two boolean controls, one implementation.

   WHY THEY SHIP TOGETHER. Everything below except six lines is shared: the box
   metric, the border tier, the fill, the glyph plate, the label composition,
   the 44px row, the focus behaviour. The two differ by a radius, a glyph, and
   whether `name` groups them. Shipping only the checkbox would have meant the
   next app hand-rolling the radio next week against a different set of those
   six lines — which is exactly how this system got a native
   `accent-[var(--action-primary)]` checkbox in a consuming app in the first
   place.

   WHY THE NATIVE INPUT IS THE PAINTED BOX (not a visually-hidden input under a
   <span> that draws a box). Both patterns keep the control real to assistive
   technology and to a form. The difference is who owns the states:

     · `appearance: none` leaves ONE element. It is the thing that is focused,
       so `.e911-app :focus-visible` in tokens.css draws the system's two-tone
       indicator around the painted box with no local rule — and rule 7 says a
       component may not draw its own. With a hidden input the ring has to be
       re-drawn on the proxy from a `:has()` or `peer-focus-visible` rule, which
       is a local focus ring by any other name, and it is the version that ends
       up 1px wide around an invisible element.
     · `:checked`, `:indeterminate`, `:disabled` and `:required` style the box
       directly, so the paint cannot desync from the DOM.
     · A failed `required` shows the browser's validation bubble anchored to the
       box a person is looking at, not to a 1px sliver in the corner of a label.

   What `appearance: none` costs is the forced-colors (Windows High Contrast)
   rendering, where our token fill is overridden and the box would come out
   empty. `forced-colors:appearance-auto` hands the control back to the OS
   there, and the glyph plate hides itself so the native tick is not doubled.

   `accent-color` alone — what the consuming app shipped — was rejected: it
   tints the native mark and leaves size, radius, border, disabled treatment and
   the focus ring to the browser, so the control is a different shape in Chrome
   and Firefox, is 13px on a wall tablet, and gets the UA focus ring instead of
   the system's.
   ========================================================================== */

type ChoiceSize = Extract<ControlSize, "md" | "tap">;

/** The painted box. NOT the tap target — see the row classes below. */
const CHECK_BOX_SIZE: Record<ChoiceSize, string> = {
  md: "size-check",
  tap: "size-check-tap",
};

interface ChoiceRenderProps {
  type: "checkbox" | "radio";
  checked: boolean;
  indeterminate?: boolean;
  size: ChoiceSize;
  invalid?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  inputRef: React.Ref<HTMLInputElement>;
  rest: React.InputHTMLAttributes<HTMLInputElement>;
}

function ChoiceControl({
  type,
  checked,
  indeterminate = false,
  size,
  invalid = false,
  disabled = false,
  children,
  className,
  onChange,
  inputRef,
  rest,
}: ChoiceRenderProps) {
  const labelled = children != null && children !== false;
  const box = CHECK_BOX_SIZE[size];

  return (
    /*
     * The <label> IS the control's hit area, and that is the whole reason the
     * label is a child rather than a `label="…"` string prop:
     *   · clicking anywhere in the row toggles the box (label activation is the
     *     browser's, not ours);
     *   · the accessible name is the label's text content, so it can carry the
     *     mono spans and the interpolated names a real attestation needs;
     *   · a 44px row around an 18px box gives the finger its target without
     *     making the box a tile. The BOX is --check-size; the TARGET is
     *     --tap-target, and they are deliberately not the same rectangle.
     * Unlabelled (a "select all" in a column head) the row collapses to a 44px
     * square around the box and the name comes from `aria-label`.
     */
    <label
      className={cn(
        "inline-flex min-h-tap text-control",
        labelled
          ? cn(
              // items-start, not items-center: an attestation is three lines
              // long and the box belongs on the first one. A one-line label
              // still centres, because the box plate below is exactly one line
              // box tall.
              "items-start",
              size === "tap" ? "gap-3 py-2.5" : "gap-2.5 py-3"
            )
          : "w-tap items-center justify-center",
        // --text-disabled, not `opacity-45` (1.7.0). The whole control still
        // dims, label included — but through a token the other controls share,
        // rather than through a fade this file chose alone. Opacity dimmed the
        // label THROUGH the card, and the label here is not a word like "Save":
        // it is the attestation an operator is being asked to agree to, three
        // lines long. 1.4.3 exempts a disabled control from the contrast floor;
        // it does not license text nobody can read.
        //
        // A ternary rather than a flag beside the base `text-ink`, because `cn`
        // is a plain join (contract.ts) — both colours would land in the class
        // attribute and Tailwind's emit order, not this file, would decide.
        disabled ? "cursor-not-allowed text-disabled-fg" : "cursor-pointer text-ink",
        className
      )}
    >
      <span
        className={cn(
          "relative flex shrink-0 items-center",
          // One line box tall, in em so it follows the label's type rather than
          // a copied px literal. This is what puts the box on the first line of
          // a wrapping label and centres it against a single-line one.
          //
          // The multiplier must equal the label's RENDERED line-height, and that
          // is 1.5 — inherited from .e911-app, because `text-control` (like
          // every 1.7.0 type token) declares font-size only. It deliberately
          // carries no line-height, so that naming the literals could not
          // retighten leading across the system inside a naming pass; see the
          // type-token block in tokens.css.
          //
          // This briefly read 1.4 during 1.7.0, when the token still bundled a
          // line-height and the label really did render at 1.4. The token
          // changed underneath it. Kept as a warning: these two numbers are one
          // measurement in two places, and the other place is a token file in
          // another directory. Let them drift and the box stops sitting on the
          // first line of a wrapping attestation, which is the only thing this
          // rule exists for — and nothing type-checks it.
          labelled && "min-h-[1.5em]"
        )}
      >
        <input
          ref={inputRef}
          type={type}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          aria-invalid={invalid || undefined}
          className={cn(
            box,
            // `peer` is load-bearing: the glyph plate below is a SIBLING with
            // its own colour, and --text-on-action disappears on the disabled
            // fill. Without `peer` there is no selector that can follow this
            // input into :disabled, and a checked-but-disabled box comes out
            // looking unchecked — a state misreport, not a dimming.
            "peer shrink-0 appearance-none border-chip bg-card",
            "transition duration-fast ease-e911",
            type === "radio" ? "rounded-pill" : "rounded-xs",
            // The checked/indeterminate fill is drawn by the browser's own
            // state selectors rather than from the React prop, so the paint
            // cannot disagree with the DOM — including the frame after a user
            // click and before a controlled re-render.
            "checked:border-action checked:bg-action",
            "indeterminate:border-action indeterminate:bg-action",
            // --border-control, not --border-default: the box is bg-card inside
            // a card that is also bg-card, so its stroke is the only thing that
            // identifies it. That is the tier held to 1.4.11's 3:1.
            invalid ? "border-bad" : "border-line-control",
            // Disabled, from the system's tokens (1.7.0). The box used to have
            // no disabled paint of its own at all — it borrowed the row's
            // `opacity-45`, so removing that fade would have left a disabled
            // checkbox looking exactly like a live one.
            "disabled:cursor-not-allowed",
            "disabled:border-line-disabled disabled:bg-disabled",
            // The compounds are not redundant. `checked:bg-action` is also
            // (0,2,0), so a bare `disabled:bg-disabled` only ties with it and
            // the cascade order settles it — and the losing outcome is a
            // disabled control painted --action-primary, which is the single
            // most pressable-looking thing in the system. (0,3,0) removes the
            // question rather than betting on Tailwind's variant order.
            "disabled:checked:border-line-disabled disabled:checked:bg-disabled",
            "disabled:indeterminate:border-line-disabled disabled:indeterminate:bg-disabled",
            // Windows High Contrast: give the box back to the OS. Without this
            // an appearance:none control paints in system colours with no mark.
            "forced-colors:appearance-auto"
          )}
          {...rest}
        />
        {checked || indeterminate ? (
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={type === "radio" ? 0 : 2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn(
              box,
              // Sits exactly on the box, never intercepts the press (the press
              // belongs to the input or to the label around it).
              "pointer-events-none absolute left-0 top-1/2 -translate-y-1/2",
              // --text-on-action on --action-primary: the same pair the primary
              // button's label is audited on.
              "text-action-fg",
              // …but the fill underneath is --surface-disabled once the input is
              // disabled, and --text-on-action is a near-white that vanishes on
              // it. The tick is the ONLY thing distinguishing a disabled checked
              // box from a disabled empty one, so it has to survive: this
              // repaints it on --text-disabled, the same tier the label uses.
              // `peer-disabled:` is (0,2,0) and beats the (0,1,0) above it.
              "peer-disabled:text-disabled-fg",
              // The OS draws its own mark in forced-colors mode.
              "forced-colors:hidden"
            )}
          >
            {type === "radio" ? (
              <circle cx="8" cy="8" r="3.4" fill="currentColor" />
            ) : indeterminate ? (
              <path d="M4.3 8h7.4" />
            ) : (
              <path d="M4 8.4l2.8 2.8L12 5.5" />
            )}
          </svg>
        ) : null}
      </span>
      {labelled ? <span className="min-w-0">{children}</span> : null}
    </label>
  );
}

/* --------------------------------------------------------------- Checkbox */

type NativeInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size" | "type" | "checked" | "defaultChecked" | "onChange" | "children"
>;

export interface CheckboxProps extends NativeInputProps {
  /** Controlled, like `Select` and `DateField`. */
  checked: boolean;
  /**
   * The event is the second argument so a form handler can still reach
   * `name`/`value` off the target; the boolean is first because that is what
   * every call site actually wants.
   */
  onChange: (checked: boolean, event: React.ChangeEvent<HTMLInputElement>) => void;
  /**
   * The third state HTML has and only JavaScript can set. Supported because the
   * alternative is a tri-state a consumer fakes with a second checkbox or with
   * `aria-checked="mixed"` on something that is not a checkbox.
   *
   * Set through the DOM property (there is no attribute), which is what makes
   * the browser expose the state as **mixed** rather than as checked — so it is
   * never announced as "checked", and it never submits a value. `checked` still
   * governs submission; a mixed box is normally `checked={false}`.
   */
  indeterminate?: boolean;
  /** Painted box: `md` = --check-size, `tap` = --check-size-tap. The hit area
   *  is --tap-target either way. */
  size?: ChoiceSize;
  /** Paints the box on --status-bad and sets `aria-invalid`. The MESSAGE is the
   *  app's — see the note on FormField in SKILL.md. */
  invalid?: boolean;
  /** The label. Rendered inside the <label> that wraps the box, so it is both
   *  the accessible name and part of the 44px hit area. */
  children?: React.ReactNode;
  /** Lands on the label ROW, not on the box — layout classes go here. */
  className?: string;
}

/**
 * A real `<input type="checkbox">`, painted by the system.
 *
 * ```jsx
 * <Checkbox checked={attested} onChange={setAttested} size="tap">
 *   I am volunteering for this shift.
 * </Checkbox>
 * ```
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      checked,
      onChange,
      indeterminate = false,
      size = "md",
      invalid = false,
      disabled = false,
      children,
      className,
      ...rest
    },
    ref
  ) => {
    const inner = React.useRef<HTMLInputElement | null>(null);

    // `indeterminate` has no HTML attribute, so React cannot set it from JSX —
    // it is a DOM property or it does not exist. Re-applied when `checked`
    // changes too: a user click clears the flag in the DOM, and a controlled
    // parent that still says "mixed" must win.
    React.useEffect(() => {
      if (inner.current) inner.current.indeterminate = indeterminate;
    }, [indeterminate, checked]);

    const setRefs = React.useCallback(
      (node: HTMLInputElement | null) => {
        inner.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      },
      [ref]
    );

    return (
      <ChoiceControl
        type="checkbox"
        checked={checked}
        indeterminate={indeterminate}
        size={size}
        invalid={invalid}
        disabled={disabled}
        className={className}
        inputRef={setRefs}
        onChange={(event) => onChange(event.target.checked, event)}
        rest={rest}
      >
        {children}
      </ChoiceControl>
    );
  }
);
Checkbox.displayName = "Checkbox";

/* ------------------------------------------------------------------ Radio */

export interface RadioProps extends Omit<NativeInputProps, "name" | "value"> {
  /**
   * Required, and required for a REASON: `name` is what makes a set of radios
   * one control to the browser — one tab stop, arrow keys moving the selection,
   * one value in the form. A radio without it is a checkbox that cannot be
   * unchecked, and nothing warns you.
   */
  name: string;
  value: string;
  checked: boolean;
  /** Receives this radio's `value` — a group's handler wants the value, not a
   *  boolean that is always true. */
  onChange: (value: string, event: React.ChangeEvent<HTMLInputElement>) => void;
  size?: ChoiceSize;
  invalid?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/**
 * A real `<input type="radio">`, painted by the system — the same box as
 * `Checkbox`, drawn round, with a dot instead of a tick.
 *
 * A SET of radios needs a group label that no single radio can carry: wrap them
 * in a `<fieldset>` with a `<legend>`, or in a `role="radiogroup"` with an
 * `aria-label`. That is deliberately the app's markup and not a `RadioGroup`
 * component here — the grouping element is where an app's own layout, error
 * copy and `aria-describedby` live, and a component that owned it would be a
 * second FormField.
 */
export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      name,
      value,
      checked,
      onChange,
      size = "md",
      invalid = false,
      disabled = false,
      children,
      className,
      ...rest
    },
    ref
  ) => (
    <ChoiceControl
      type="radio"
      checked={checked}
      size={size}
      invalid={invalid}
      disabled={disabled}
      className={className}
      inputRef={ref}
      onChange={(event) => onChange(event.target.value, event)}
      rest={{ ...rest, name, value }}
    >
      {children}
    </ChoiceControl>
  )
);
Radio.displayName = "Radio";
