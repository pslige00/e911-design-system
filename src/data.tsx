"use client";

import * as React from "react";
import { cn, CONTROL_HEIGHT, type ControlSize, type EdgeColor, type Tone } from "./core";
// feedback.tsx carries no "use client" of its own — see the note at the top of
// it. Importing it from here does not change that for anyone else.
import { Skeleton } from "./feedback";

/* --------------------------------------------------------------- edge map */
const edgeClass: Record<EdgeColor, string> = {
  orange: "border-t-edge-orange",
  teal: "border-t-edge-teal",
  gold: "border-t-edge-gold",
  green: "border-t-edge-green",
  plum: "border-t-edge-plum",
  blue: "border-t-edge-blue",
};

const headingTag = {
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
} as const;

/* ------------------------------------------------- dev-only clip detection */
// Typed locally because this package ships no @types/node — see tsconfig. The
// declaration is module-scoped, so it shadows nothing in a consumer that has
// them, and it is erased before any bundler sees the file.
declare const process: { env: { NODE_ENV?: string } };

/**
 * How far content may stick out before this is called a clip, in CSS px.
 *
 * Agreed with the consuming team from measurements, not chosen: 1px deltas are
 * pure sub-pixel rounding on fractional grid tracks and occur all over a
 * healthy page. A warning that fires on those gets muted within a day, and then
 * the 42px one is muted with it. The floor is the price of being believed —
 * and it does mean a genuine but tiny clip (they measured one at 133 against
 * 130) passes unremarked. That is the deliberate half of the trade.
 */
const CLIP_FLOOR = 4;

/**
 * WHY A CARD THAT CLIPS ITS OWN CONTENT HAS TO SAY SO.
 *
 * `DomainCard` is `overflow-hidden` and has to be — a flush table would
 * otherwise square off the card's own rounded corners. The cost is that content
 * wider than the card is CUT OFF IN SILENCE: no scrollbar, no overflow, nothing
 * on screen, and no automated check either repo runs can see it. The first
 * consuming app lost a `StatusTag` that way — "Paid"/"Unpaid" off the end of
 * every row on /balances at 320px, which is status conveyed by a pill that is
 * not on screen, at the exact width WCAG 1.4.10 names. An AA failure with no
 * symptom.
 *
 * `DataTable` already `console.error`s when `ctx.rowLink` is called twice, on
 * the grounds that it is always a defect and the type system cannot express it.
 * Same argument, and it is the reason this is a runtime warning rather than a
 * lint rule: no prop is wrong and no type is violated, the RENDER is wrong.
 *
 * WHY IT OBSERVES THE CHILDREN RATHER THAN THE CARD, which is the thing most
 * likely to be got wrong by someone rewriting this: **a `ResizeObserver` on the
 * card only fires when the CARD resizes.** The reported case was text reflowing
 * inside a card whose own box never changed size — a name arriving from the
 * server longer than the seed's — so a card-level observer is blind to exactly
 * the case this exists for. One observer takes many targets, and a
 * `MutationObserver` picks up children that arrive later. Border-box, not
 * content-box: a child that grows by padding or border keeps its content box
 * and would not fire otherwise.
 *
 * WHAT IT DELIBERATELY STAYS QUIET ABOUT, all measured rather than guessed:
 *
 * - **The `flush` variant.** There the clipping is usually a child's, and that
 *   child owns a considered scroller (`DataTable`'s). Naming the card would
 *   send the reader to the wrong file, and silence beats misdirection.
 * - **Anything inside a nested scroller.** /balances holds a 1655px ledger
 *   inside a 286px card on purpose; it is wider than the box AND reachable.
 *   The walk stops at the first scrollable — or self-clipping — descendant, so
 *   this does not fire on every `DataTable` in the app.
 * - **Absolutely- and fixed-positioned descendants.** Decorative bleed is
 *   deliberate: the Ribbon's circle hangs outside its box by design, and
 *   `.sr-only` is `position: absolute` and one pixel wide.
 * - **The card's own padding.** The clip edge is the PADDING box, not the body's
 *   content box; content spilling into the card's own 16px is not clipped and
 *   is not a defect.
 */
function useClipWarningDev(flush: boolean) {
  // A callback ref rather than useRef, for the same reason DataTable uses one:
  // the observer follows the DOM node instead of a dependency list.
  const [card, setCard] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    if (flush || !card) return;
    // Guarded because consumers render this component under jsdom, where
    // neither constructor exists and an unguarded `new` is a ReferenceError
    // that takes the whole test file with it.
    if (typeof ResizeObserver === "undefined" || typeof MutationObserver === "undefined") return;

    let targets: Element[] = [];
    let frame = 0;
    // The last message printed, so a card inside a screen that re-renders on a
    // one-second tick reports its clip once rather than sixty times a minute.
    let last = "";

    /** Every descendant whose overflow is THIS card's to answer for. */
    const collect = (root: Element): Element[] => {
      const out: Element[] = [];
      const walk = (el: Element) => {
        for (const kid of el.children) {
          const s = getComputedStyle(kid);
          if (s.position === "absolute" || s.position === "fixed") continue;
          out.push(kid);
          // Stop, but only after counting the element itself: a box that
          // scrolls or clips on its own account keeps its children off the
          // card's edge, so walking into it can only produce a culprit that is
          // not in fact being clipped by the card.
          const ox = s.overflowX;
          if (ox !== "visible") continue;
          walk(kid);
        }
      };
      walk(root);
      return out;
    };

    const describe = (el: Element) => {
      const cls = el.getAttribute("class") ?? "";
      const shown = cls.length > 90 ? `${cls.slice(0, 90)}…` : cls;
      return `<${el.tagName.toLowerCase()}${shown ? ` class="${shown}"` : ""}>`;
    };

    const check = () => {
      const rect = card.getBoundingClientRect();
      const cs = getComputedStyle(card);
      const left = rect.left + parseFloat(cs.borderLeftWidth);
      const right = rect.right - parseFloat(cs.borderRightWidth);
      let worst: Element | null = null;
      let by = 0;
      let count = 0;
      for (const el of targets) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue; // display:none, or detached
        const over = Math.max(r.right - right, left - r.left);
        if (over < CLIP_FLOOR) continue;
        count += 1;
        if (over > by) {
          by = over;
          worst = el;
        }
      }
      // Nothing NAMEABLE is being clipped. Staying quiet is deliberate even
      // when the card's own scrollWidth says otherwise — a warning that cannot
      // point at the offender sends the reader hunting through the wrong file.
      if (!worst) {
        last = "";
        return;
      }
      const heading = card.querySelector(":scope > div > :is(h2,h3,h4,h5,h6)")?.textContent?.trim();
      const name = heading || card.textContent?.trim().slice(0, 40);
      const msg =
        `[e911] DomainCard${name ? ` "${name}"` : ""} is clipping its own content: ` +
        `${Math.round(by)}px of it is cut off. The card is overflow-hidden, so there is no ` +
        `scrollbar and nothing on screen to say anything is missing.\n` +
        `  cut off: ${describe(worst)}\n` +
        (worst.parentElement && worst.parentElement !== card
          ? `  inside:  ${describe(worst.parentElement)}\n`
          : "") +
        (count > 1 ? `  (and ${count - 1} more)\n` : "") +
        `  Most likely a flex item with a width but no \`min-w-0\`. A width on a flex item is a ` +
        `basis, not a floor: flex-shrink still defaults to 1, so the item gives that width back ` +
        `under pressure until it hits its own min-content, and the row runs off the end. ` +
        `Wrapping the row does NOT fix this on its own — a nested flex container will not shrink ` +
        `below its own content without \`min-w-0\` either, and it stays clipped by the same amount.`;
      if (msg === last) return;
      last = msg;
      console.error(msg);
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        check();
      });
    };

    const ro = new ResizeObserver(schedule);
    const retarget = () => {
      // Disconnect first so removed children are not observed forever. The
      // re-observe fires an initial callback per target, which schedules one
      // more check — and `check` mutates nothing, so there is no loop.
      ro.disconnect();
      targets = collect(card);
      ro.observe(card, { box: "border-box" });
      for (const t of targets) ro.observe(t, { box: "border-box" });
    };
    // No `attributes`: an attribute that changes a child's size already fires
    // the ResizeObserver above, and watching them adds a callback per class
    // toggle on screens that toggle classes every second.
    const mo = new MutationObserver(() => {
      retarget();
      schedule();
    });
    retarget();
    schedule();
    mo.observe(card, { childList: true, subtree: true, characterData: true });
    return () => {
      mo.disconnect();
      ro.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [card, flush]);
  return setCard;
}

/**
 * Chosen once, at module scope, so production calls no hooks at all rather than
 * calling them and returning early — the branch is constant for the lifetime of
 * the module, which is the condition the rules of hooks actually require.
 *
 * TWO THINGS ABOUT THIS LINE ARE LOAD-BEARING, both measured against esbuild
 * with the app's own `--define`:
 *
 * `process.env.NODE_ENV` is written out in full rather than read from a `DEV`
 * const above. Every bundler in this ecosystem replaces that exact member
 * expression with a literal, so this folds to `() => undefined` and everything
 * above becomes unreachable and is dropped. Through a named const it folds just
 * the same but the dev path SURVIVES tree-shaking — 2KB of observer code that
 * ships to a PSAP and can never run. A `typeof process` guard or optional
 * chaining is worse still: neither matches the replacement, so a real `process`
 * lookup reaches the browser.
 *
 * And the fallback is `() => undefined`, not `undefined`, because DomainCard
 * calls it unconditionally.
 */
const useClipWarning: (flush: boolean) => ((el: HTMLElement | null) => void) | undefined =
  process.env.NODE_ENV !== "production" ? useClipWarningDev : () => undefined;

/* ------------------------------------------------------------- DomainCard */
export interface DomainCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  edge: EdgeColor; // keyed by domain — see DOMAIN_EDGE in core
  /** Card header. When set, children render below a divider with no padding
      collapse — use for tables. */
  title?: React.ReactNode;
  /**
   * Heading rung for `title`. Defaults to **2**, which is the case a card is
   * almost always in: a Ribbon renders the page's h1, so a card directly under
   * it is the page's second rung.
   *
   * It defaulted to 3 until 1.10.0, which is what this component hard-coded
   * until 1.4.0 — and which no page could make correct: a card under a Ribbon
   * jumped h1 → h3 with no h2 on every screen in every app. 1.4.0 added the
   * prop and LEFT THE DEFAULT AT 3, so the trap it was built to remove stayed
   * armed: 6 of the 57 files using DomainCard in the first consuming app passed
   * it, and an audit found the h1 → h3 skip on 17 of 21 routes. One of those
   * routes had eleven h3s and no h2 — one flat rung, so "jump by section" did
   * nothing. A default that is wrong at 51 of 57 call sites is not an escape
   * hatch, it is the bug with a workaround beside it.
   *
   * Pass 3 (or lower) for a card genuinely nested under another card's h2, and
   * 2 stays correct without a prop everywhere else.
   *
   * Sizing does NOT follow the level: a card title is --font-size-h3 whatever
   * its rung, because the outline is about structure and the type scale is
   * about density. That is the whole reason a level prop exists rather than a
   * "make it bigger" one.
   */
  titleLevel?: 2 | 3 | 4 | 5 | 6;
  headerRight?: React.ReactNode;
  /** Remove body padding (tables want edge-to-edge). */
  flush?: boolean;
}

export function DomainCard({
  edge,
  title,
  titleLevel = 2,
  headerRight,
  flush = false,
  className,
  children,
  ...rest
}: DomainCardProps) {
  // A lookup rather than a template string: JSX needs a component type here,
  // and `h${n}` widens to `string`, which is not one.
  const Heading = headingTag[titleLevel];
  // A <section> with no accessible name is not a landmark at all — it is a
  // plain grouping the screen reader never offers as a destination, which on a
  // route carrying five stacked table cards means no way to move between them.
  // Named from its own title, so it costs the app nothing; `id` is generated
  // per instance because a page renders many of these.
  const reactId = React.useId();
  const titleId = `${reactId}-title`;
  const { "aria-labelledby": ariaLabelledBy, "aria-label": ariaLabel, ...sectionRest } = rest;
  const clipRef = useClipWarning(flush);
  return (
    <section
      // `undefined` in production — see useClipWarning. Nothing can collide
      // with it: `ref` is not in DomainCardProps, so no consumer can pass one.
      ref={clipRef}
      // An app-supplied name wins: a card titled "Open" on a page of them may
      // need to say which queue it belongs to.
      aria-labelledby={ariaLabelledBy ?? (title != null && !ariaLabel ? titleId : undefined)}
      aria-label={ariaLabel}
      className={cn(
        // `relative` is NOT layout here — nothing inside is positioned against
        // it — it is what makes `overflow-hidden` on the next line actually
        // clip. An absolutely-positioned descendant with no positioned ancestor
        // resolves against the INITIAL containing block, and an overflow
        // ancestor only clips what its own containing block contains, so such a
        // descendant escapes the card entirely. `.sr-only` is
        // `position: absolute`, the system encourages it inside cards and
        // tables, and it is 1px of invisible text — so the escape presents as a
        // page that scrolls sideways for no visible reason. Measured on one
        // consumer's /admin at 390px: 170 escaped `.sr-only` nodes, the
        // furthest at x=445, and `documentElement.scrollWidth` 446 against a
        // 390 viewport (WCAG 1.4.10 Reflow). Adding this took it to exactly 390.
        //
        // dialog.tsx documents the same escape mechanism for its own case and
        // RELIES on it — a Dialog is `position: fixed`, which `relative` does
        // not capture (only a transformed ancestor does), so floating layers
        // are unaffected. Select, Tooltip and DateField's calendar are all
        // fixed for that reason.
        "relative",
        // rounded-md, not bare `rounded`: the bare utility reads Tailwind v4's
        // deprecated --radius key, which is one more thing that has to be right.
        "min-w-0 overflow-hidden rounded-md border border-line bg-card shadow-card",
        "border-t-edge", // 4px top border width
        edgeClass[edge],
        // NOT a style — a SELECTOR for tokens.css, on the same terms as
        // `e911-card-flush` below. Under `forced-colors: active` the browser
        // rewrites `border-top-color` to a system colour, so all six domain
        // hues render as one and the cross-app identity signal is simply gone:
        // measured on /now, every edge `rgb(0, 0, 0)`. The edge is a border,
        // and a border has no selector of its own, so tokens.css cannot reach
        // it to opt it out — hence a class, and a second one carrying which
        // hue, because a custom property is the one thing forced colours do not
        // rewrite. Nothing here paints; see the forced-colours block in
        // tokens.css for what does, and for why the opt-out is 4px tall.
        "e911-card-edge",
        `e911-card-edge-${edge}`,
        // Not a style — a SIGNAL to tokens.css that this box clips its
        // children, so every focusable inside must draw its indicator inward
        // instead of outward (1.8.0). The global indicator reaches 7px outside
        // a control's border box; `overflow-hidden` above removes all of it on
        // an edge a control sits flush against, with no error and nothing to
        // see. CSS cannot detect "my indicator would be clipped", so the
        // clipping container has to say so.
        //
        // Only when `flush`: a padded card gives 16px against a 7px reach, and
        // scoping this to the case that actually clips keeps the default
        // outward indicator wherever it still fits. See tokens.css.
        flush && "e911-card-flush",
        className
      )}
      {...sectionRest}
    >
      {title != null && (
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Heading id={titleId} className="font-display text-h3 tracking-[-0.01em]">
            {title}
          </Heading>
          {headerRight ? <div className="ml-auto flex items-center gap-2">{headerRight}</div> : null}
        </div>
      )}
      <div className={flush ? undefined : "p-4"}>{children}</div>
    </section>
  );
}

/* ---------------------------------------------------------------- KpiCard */
export interface KpiCardProps {
  edge: EdgeColor;
  label: string;
  value: string; // preformatted — keeps tabular alignment honest
  delta?: { text: string; direction: "up" | "down" | "flat" };
  sub?: string;
  className?: string;
}

/**
 * Deliberately NOT a named region, unlike a titled DomainCard: it renders a
 * DomainCard with no `title`, so its <section> stays anonymous and screen
 * readers do not offer it as a landmark. A KPI strip is six tiles wide, and six
 * landmarks called "Coverage", "On duty", "Exceptions" between the page header
 * and the first table is noise in the rotor, not navigation. The label reads
 * immediately before the numeral in DOM order, which is the association that
 * matters here.
 */
export function KpiCard({ edge, label, value, delta, sub, className }: KpiCardProps) {
  return (
    <DomainCard edge={edge} className={className}>
      <span className="block text-label font-semibold uppercase tracking-[0.05em] text-faint">
        {label}
      </span>
      <b className="mt-1 block font-display text-kpi tabular-nums">{value}</b>
      {(delta || sub) && (
        <span className="mt-1 flex items-center gap-1.5 text-meta text-muted">
          {delta ? (
            <span
              className={cn(
                // `rounded-xs` (1.8.0). This was a 6px arbitrary radius — the
                // last one the package drew without declaring — and the note
                // here said it stayed "until a token exists". 1.8.0 is that
                // token, arrived at by widening the scope of one rather than
                // minting a fifth: --e911-radius-xs is no longer "the Checkbox
                // box", it is any painted box 20px or under on its short side,
                // which is what the scope always meant. This pill is ~17px
                // tall, so 5px is 29% of it — inside the 25-29% band every
                // corner in the system sits in, where 6px was 35%. `sm` is
                // still unavailable: 8px here is clamped by the browser to half
                // the height and paints as a stadium, which is a StatusTag's
                // shape, and this is not a status.
                //
                // MUST stay in step with CertChip in core.tsx, which is the
                // same badge at the same radius and moved in the same commit.
                //
                // The old note spelled the arbitrary utility out in prose, and
                // that alone kept a live 6px rule in the compiled CSS: Tailwind
                // scans source as raw TEXT and does not know what a comment is.
                // Do not write a bracketed utility in a comment in this repo,
                // even to say you are removing it.
                // `whitespace-nowrap` because a KPI strip is a GLANCE surface
                // and the pill is sized by its content: "−19" measured 30×17
                // and "6 short" 42×32 at every viewport, so four cards in a row
                // showed pills at two different heights. That reads as a
                // rendering fault in the half-second the strip gets, which is
                // the opposite of what the strip is for. Nothing is clipped —
                // the pill simply grows sideways into the card's own padding.
                "whitespace-nowrap rounded-xs px-1.5 py-px font-mono text-badge font-medium",
                delta.direction === "up" && "bg-ok-soft text-ok",
                delta.direction === "down" && "bg-bad-soft text-bad",
                delta.direction === "flat" && "bg-tint text-muted"
              )}
            >
              {delta.text}
            </span>
          ) : null}
          {sub}
        </span>
      )}
    </DomainCard>
  );
}

/* -------------------------------------------------------------- DataTable */
/**
 * The second argument to every `cell`, added in 1.5.0.
 *
 * `rowLink` wraps the part of a cell that IS the row's link. Until 1.5.0 the
 * anchor swallowed the WHOLE first cell, so the link's accessible name absorbed
 * everything in it: a first cell reading `Huskey, Christopher` + a `CertChip`
 * + a `StatusTag` announced as "Huskey, Christopher KC-1119 Blocking". That is
 * informative by luck at best — the severity word belongs to the row, not to
 * the destination — and there was no way to narrow it from outside.
 *
 * Call it around the row's subject and the rest of the cell stays outside the
 * anchor, where a screen reader still reads it as cell content:
 *
 *   cell: (row, { rowLink }) => (
 *     <span className="flex flex-col items-start">
 *       {rowLink(<span className="font-medium">{row.title}</span>)}
 *       <StatusTag tone={row.tone}>{row.severity}</StatusTag>
 *     </span>
 *   )
 *
 * Not calling it is still correct and is what every pre-1.5.0 table does: the
 * anchor then wraps the first cell exactly as before. Outside a navigating row
 * — no `rowHref`, or `rowClickable` false — it is the identity function, so a
 * totals row rendered by the same `cell` gets plain content rather than a link
 * to nowhere.
 */
export interface CellContext {
  rowLink: (content: React.ReactNode) => React.ReactNode;
}

export interface Column<Row> {
  key: string;
  header: React.ReactNode;
  /** Cell content. `ctx.rowLink` scopes the row's link — see CellContext. */
  cell: (row: Row, ctx: CellContext) => React.ReactNode;
  /** Right-align numeric columns; digits should already be tabular/mono. */
  align?: "left" | "right";
  width?: string;
}

export interface DataTableProps<Row> {
  columns: Array<Column<Row>>;
  rows: Row[];
  rowKey: (row: Row) => string;
  onRowClick?: (row: Row) => void;
  /**
   * Destination for a row that NAVIGATES. Prefer this to `onRowClick` for
   * navigation: `onRowClick` alone is a `<tr onClick>`, which is mouse-only —
   * no tab stop, no Enter, nothing in the a11y tree — and a table of rows that
   * only navigate under a pointer is a 2.1.1 failure the app cannot fix from
   * outside without hand-placing its own link in a cell.
   *
   * The link is rendered inside the FIRST column's cell, wrapping whatever that
   * column already renders, so each row gets exactly one tab stop whose
   * accessible name is the thing the row is about ("M. Alvarez"), not "row 12".
   * Clicking anywhere else in the row still works — see `onRowClick` below.
   */
  rowHref?: (row: Row) => string | undefined;
  /**
   * What the row link is FOR, appended to its accessible name after the visible
   * text: "Never punched out" becomes "Never punched out — show these 87 in the
   * queue". Added in 1.5.0.
   *
   * WCAG 2.4.4 asks that a link's purpose be clear; in a rotor list of 24
   * identical-looking row links, "Never punched out" is a subject and not a
   * destination. The first consumer had exactly this name on hand-built links
   * and lost it migrating onto `rowHref`, because `renderLink` receives no
   * per-row label.
   *
   * It is a SUFFIX, not a label, and that is the whole design. WCAG 2.5.3
   * (Label in Name) requires the accessible name to start with the visible
   * text, and a free-form `rowLinkLabel` would let an app return "Show 87" over
   * a row reading "Never punched out" — speech input then has no way to
   * activate the link by what it says, and nothing would have caught it. Here
   * the visible content is the anchor's own children and the purpose is a
   * visually-hidden span AFTER it, so the ordering is structural: there is no
   * value this callback can return that violates 2.5.3.
   *
   * It rides inside `children`, so a router-aware `renderLink` carries it with
   * no change — rather than as an `aria-label`, which would have meant a new
   * field on RowLinkRenderer that every existing renderer drops on the floor.
   *
   * Write the connective in the string if you want one ("— show these 87…");
   * the component adds a separating space and nothing else.
   */
  rowLinkPurpose?: (row: Row) => string | undefined;
  /**
   * Router-aware link component, same contract as AppShell's. Without it an
   * `rowHref` row falls back to a plain <a>, which navigates correctly and
   * costs a full page load.
   */
  renderLink?: RowLinkRenderer;
  /**
   * Which rows respond at all. Summary and total rows navigate nowhere, and
   * without this they still showed a pointer cursor and a hover and then did
   * nothing — an affordance that lies. Applies to `onRowClick` and `rowHref`
   * alike.
   */
  rowClickable?: (row: Row) => boolean;
  /**
   * What an empty table says. DEFAULTED rather than required (1.7.0): until
   * then the guard was `rows.length === 0 && empty`, so a table that shipped
   * without the prop rendered a header row over nothing at all — a column
   * strip with a void under it, which reads as "still loading" or as "the app
   * is broken", never as "there is nothing here". Every consuming screen that
   * forgot the prop had that bug and none of them looked wrong in review,
   * because the header made the card look populated.
   *
   * Defaulted and not made required on purpose: making it required is a
   * compile error in every consumer that was already correct-by-omission on a
   * table that is never empty, which turns a rendering fix into a migration.
   * The default is deliberately flat — a system cannot know what is missing or
   * what would end it. Pass an <EmptyState> the moment you can say either.
   */
  empty?: React.ReactNode;
  /**
   * Render skeleton rows instead of `rows` (1.7.0). The system had no loading
   * state at all before this, and the gap is not cosmetic: a table that is
   * still fetching and a table with no rows were the SAME rendering, so an
   * operator on a slow link read "No exceptions" off a queue that had 40 of
   * them and walked away. `loading` outranks the empty path for exactly that
   * reason — an empty state may not flash before the data lands.
   *
   * The header renders throughout, so the column strip does not jump when the
   * rows arrive.
   */
  loading?: boolean;
  /**
   * How many skeleton rows. The default holds roughly a card's worth of height
   * so the page does not reflow under the pointer when the real rows land.
   */
  loadingRows?: number;
  "aria-label"?: string;
}

/**
 * The row's link is found again by CLASS, not by a data attribute: an app's
 * renderLink only receives `className`, so the marker has to ride in there or
 * a router-aware <Link> loses it. No styles hang off the name — a row link
 * must look exactly like the text it replaced, because the row is the
 * affordance and the anchor is only how a keyboard reaches it.
 */
const rowLinkClass = "e911-row-link";

/** Mirrors AppShell's RailLinkRenderer so an app wires both the same way. */
export type RowLinkRenderer = (props: {
  href: string;
  className: string;
  children: React.ReactNode;
}) => React.ReactNode;

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  onRowClick,
  rowHref,
  rowLinkPurpose,
  renderLink,
  rowClickable,
  empty = "No rows to show.",
  loading = false,
  loadingRows = 5,
  ...rest
}: DataTableProps<Row>) {
  // WHETHER THE SCROLL REGION BELOW IS A TAB STOP AND A LANDMARK IS MEASURED,
  // NOT ASSUMED. Both were unconditional until 1.10.0, and at desktop widths a
  // DataTable almost never overflows: an audit of one consuming app at 1280px
  // found every region in it with `scrollWidth === clientWidth` and all of them
  // still carrying `tabIndex=0` + `role="region"` + a name. Three of the live
  // board's seventeen tab stops were scroll boxes with nothing to scroll, and
  // every table was a second near-duplicate landmark inside its own card —
  // "Staffed against minimum" containing "Staffing by position against minimum
  // staffing", 13 landmarks on a page that has 6 things on it, and on one route
  // the two names matched exactly and axe raised `landmark-unique`.
  //
  // Hooks live ABOVE the empty-table early return because they must: React
  // requires the same hooks in the same order on every render, and a table that
  // starts empty and later has rows re-renders through this function both ways.
  //
  // A callback ref rather than useRef + a dependency list, so the observer
  // follows the DOM node: the early return below unmounts the box entirely, and
  // this is then called with null and the effect tears down on its own.
  const [box, setBox] = React.useState<HTMLDivElement | null>(null);
  const [scrollable, setScrollable] = React.useState(false);
  React.useEffect(() => {
    if (!box) return;
    const measure = () => setScrollable(box.scrollWidth > box.clientWidth);
    measure();
    // Guarded because this module is rendered under jsdom by consumers' unit
    // tests, where ResizeObserver does not exist and an unguarded `new` is a
    // ReferenceError that takes the whole test file with it. Without an
    // observer the region keeps its first measurement, which is the pre-1.10.0
    // behaviour minus the false tab stop.
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(box); // the viewport side: the card gets narrower
    // The content side, and NOT optional: the table is `min-w-max`, so rows
    // arriving or a column widening changes what has to fit without the box
    // itself resizing at all. Observing only the box leaves a table that
    // silently became scrollable unreachable from the keyboard.
    const table = box.querySelector("table");
    if (table) ro.observe(table);
    return () => ro.disconnect();
  }, [box]);
  // `loading` outranks the empty path — see the prop. An empty state that
  // flashes before the rows land is worse than none, because it is a sentence
  // the operator believes and acts on.
  if (!loading && rows.length === 0) {
    return <div className="px-4 py-9 text-center text-ribbon-meta text-muted">{empty}</div>;
  }
  // Emptied rather than skipped, so the skeleton branch below needs no second
  // guard and the row renderer keeps its indentation and its diff.
  const bodyRows: Row[] = loading ? [] : rows;
  return (
    <div
      /* THE SCROLL REGION (1.7.0). Without it a wide table is CLIPPED and gone:
         DomainCard sets overflow-hidden (it has to — a flush table would
         otherwise square off the card's own corners), this table renders wider
         than the card whenever the sum of its columns exceeds it, and the
         header cells are whitespace-nowrap so they cannot shrink to fit. On a
         1024px wall tablet that means the right-hand columns of a timecard are
         not merely awkward to read, they are unreachable — no scrollbar, no
         cut-off edge, no hint that anything is missing. Six screens in the
         first consuming app had each wrapped this component in an overflow-x
         div of their own, which is the system being asked for something six
         times and not answering.

         tabIndex + role + name are the accessibility half, and WHILE THE BOX
         SCROLLS they are not optional decoration: content a keyboard user must
         be able to reach, and a container that only a pointer can pan is a
         2.1.1 failure on the same grounds this component already refused to
         let `onRowClick` navigate a row. Naming the region duplicates the
         table's own name by design — "Exception queue region", then "Exception
         queue table" — which is what a <caption> would give if this component
         had one, and an anonymous tab stop is worse than a repeated word.
         While it does NOT scroll, all three are noise — see the measurement at
         the top of this function.

         NO FOCUS RING HERE. tokens.css draws one indicator for the whole
         system; a local ring is how one control ends up with a different one.
         (It is also unlayered CSS, so a utility could not win against it
         anyway — see the border-radius note in tokens.css.)

         WATCH OUT if a sticky header is ever added: `overflow-x: auto` makes
         this a scroll container on BOTH axes, because CSS resolves the other
         axis's `visible` to `auto`. A `position: sticky` thead would then stick
         to this box rather than to the viewport, and this box never scrolls
         vertically — so the header would simply stop sticking, silently. */
      ref={setBox}
      // -1 rather than no attribute at all: a window widened while focus sits
      // on this box would otherwise drop focus to <body>, which is the reset
      // that loses a keyboard user their place mid-shift. -1 keeps the node
      // focusable programmatically and out of the tab order.
      tabIndex={scrollable ? 0 : -1}
      role={scrollable ? "region" : undefined}
      // Falls back to a generic name rather than going unnamed: role="region"
      // with no accessible name is not exposed as a landmark at all (the same
      // trap DomainCard's <section> was in), and the fallback at least tells a
      // keyboard user what they have landed on. Pass `aria-label`. Dropped
      // with the role when there is nothing to scroll — a name on a roleless
      // div names nothing, and `rest` still spreads the same label onto the
      // <table> below, which is the name that was always doing the work.
      aria-label={scrollable ? (rest["aria-label"] ?? "Table") : undefined}
      // `relative` for the same reason DomainCard now carries it — see the long
      // note there. Without it the `.sr-only` text inside these cells resolves
      // against the initial containing block, is laid out at its static
      // position inside the scrolled-away part of the table, escapes this box's
      // clip and widens the DOCUMENT. Belt and braces with the card: either one
      // alone fixed the measured case, and a DataTable is also used outside a
      // DomainCard, where the card's `relative` is not there to save it.
      className="relative overflow-x-auto"
    >
      {loading ? (
        // aria-busy says "this is in flux" to a reader already on the table; a
        // status says it to one who is not. Neither is the skeleton's job —
        // see Skeleton, which is aria-hidden.
        <span role="status" className="sr-only">
          Loading…
        </span>
      ) : null}
      {/* min-w-max is the "do not crush" half. w-full alone lets the table
          resolve to the container width and squeeze columns until cells wrap,
          which turns a 40px row rhythm into ragged four-line rows rather than
          into a scroll — and wrapping is the failure mode that looks fine in
          review and is unusable on the floor. max-content rather than a px
          floor on purpose: a number here would be an undeclared metric that
          drifts, while the keyword states the actual rule the system wants —
          a DataTable scrolls, it never crushes. */}
      <table
        className="w-full min-w-max border-collapse"
        aria-busy={loading || undefined}
        {...rest}
      >
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                // Implicit column scope is what every current browser and AT
                // infers anyway; saying it is free, and no consumer can add it
                // without hand-rolling the markup this component exists to own.
                scope="col"
                style={c.width ? { width: c.width } : undefined}
                className={cn(
                  "whitespace-nowrap border-b border-line bg-sunken px-4 py-2",
                  // The tracking stays HERE and --text-micro deliberately does
                  // not carry it. The token has two consumers that genuinely
                  // disagree — this header at 0.06em and the ribbon eyebrow at
                  // 0.1em — so any value in the token is silently wrong at one
                  // of them, and "silently wrong at one call site" is the whole
                  // failure this pass exists to end.
                  //
                  // This briefly read without the tracking during 1.7.0, when
                  // the token still declared 0.06em; removing that from the
                  // token to serve the eyebrow took the header's tracking with
                  // it, and nothing type-checks a letterform.
                  "text-micro font-semibold uppercase tracking-[0.06em] text-faint",
                  c.align === "right" ? "text-right" : "text-left"
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? <SkeletonRows columns={columns} count={loadingRows} /> : null}
          {bodyRows.map((row) => {
            const active = rowClickable ? rowClickable(row) : true;
            const href = active && rowHref ? rowHref(row) : undefined;
            const interactive = active && (href != null || onRowClick != null);
            const purpose = href != null && rowLinkPurpose ? rowLinkPurpose(row) : undefined;

            // The purpose is the anchor's LAST child, never an aria-label: the
            // name is then "visible text, then purpose" by construction, which is
            // what WCAG 2.5.3 asks for and what no string prop could guarantee.
            let linkCount = 0;
            const rowLink = (content: React.ReactNode): React.ReactNode => {
              if (href == null) return content; // a row that navigates nowhere
              linkCount += 1;
              const children = purpose ? (
                <>
                  {content}
                  <span className="sr-only">{` ${purpose}`}</span>
                </>
              ) : (
                content
              );
              return renderLink
                ? renderLink({ href, className: rowLinkClass, children })
                : <a href={href} className={rowLinkClass}>{children}</a>;
            };

            // Cells are rendered BEFORE the row is assembled so the fallback can
            // see whether any of them claimed the link. Two passes would be one
            // too many; React nodes are values, so building the array first costs
            // nothing and lets any column host the anchor.
            const cells = columns.map((c) => c.cell(row, { rowLink }));
            if (href != null && linkCount === 0 && cells.length > 0) {
              // Pre-1.5.0 behaviour, unchanged: the anchor wraps the first cell.
              cells[0] = rowLink(cells[0]);
            }
            if (linkCount > 1) {
              // Two anchors is two tab stops for one destination, and the row's
              // own click delegates to whichever comes first. Always a defect.
              console.error(
                "[e911] DataTable: ctx.rowLink was called more than once in one row — " +
                  "a row has exactly one link. Wrap only the row's subject."
              );
            }
            return (
              <tr
                key={rowKey(row)}
                onClick={
                  interactive
                    ? (e) => {
                        // A click that already landed on the row's own link has
                        // navigated; re-firing it here would navigate twice.
                        if (e.target instanceof Element && e.target.closest("a.e911-row-link")) return;
                        if (onRowClick) onRowClick(row);
                        // Delegate to the LINK rather than to a router this
                        // package does not have: whatever the app passed as
                        // renderLink handles the navigation, so a row click and a
                        // keyboard activation take exactly the same path.
                        else e.currentTarget.querySelector<HTMLAnchorElement>("a.e911-row-link")?.click();
                      }
                    : undefined
                }
                className={cn(
                  "border-b border-line-row last:border-b-0",
                  interactive && "cursor-pointer transition duration-fast hover:bg-tint"
                )}
              >
                {columns.map((c, i) => (
                  <td
                    key={c.key}
                    className={cn(
                      "h-row px-4 align-middle text-table",
                      c.align === "right" && "text-right"
                    )}
                  >
                    {cells[i]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The loading table's rows. Split out so the real row renderer above keeps its
 * shape — a ternary around 60 lines of row assembly is a diff nobody can read.
 *
 * Rendered inside the SAME <table> as the header, deliberately: a spinner in
 * place of the whole table throws away the column widths, so the page reflows
 * twice (once into the spinner, once out of it) and the operator's pointer is
 * over something else by the time the rows arrive.
 */
function SkeletonRows<Row>({ columns, count }: { columns: Array<Column<Row>>; count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <tr key={`e911-skeleton-${i}`} className="border-b border-line-row last:border-b-0">
          {columns.map((c) => (
            // h-row, matching the real cell below, is the whole point: the
            // loading table occupies exactly the height the loaded one will.
            <td key={c.key} className="h-row px-4 align-middle">
              {/* Fixed fractions rather than a random length per row: a
                  skeleton that reshuffles on re-render is motion nobody asked
                  for. A right-aligned (numeric) column loads a right-aligned
                  bar, so the eye is already where the digits will be. */}
              <Skeleton className={c.align === "right" ? "ml-auto w-1/2" : "w-2/3"} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* -------------------------------------------------------------- FormField */
export interface FormFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string; // when set: red border, red hint, aria-invalid
  /**
   * Painted height of the control this field composes (1.5.0). `tap` is the
   * wall-tablet size — see ControlSize.
   *
   * Deliberately NOT passed down through the props object below: an app writes
   * `<input {...props} />`, and `size` on an <input> is a real HTML attribute
   * meaning "width in characters". Pass it to a Select or DateField explicitly
   * alongside this one; both take the same prop and the same values.
   */
  size?: Extract<ControlSize, "md" | "tap">;
  /**
   * Whether an answer is REQUIRED (1.10.0). Until then the system had no way to
   * say so at all: an audit of one consuming app found 51 controls across seven
   * screens, every one of them `required=false` and `aria-required=null`, on
   * forms where a dispatcher is shown "Kind of leave", "First day off", "Hours
   * in total" with nothing to say which of them may be left alone. WCAG 3.3.2
   * Labels or Instructions. That app's `/login`, the one form that does NOT go
   * through this component, gets it right with native `required` — which is the
   * shape of the gap exactly.
   *
   * Sets three things, and all three are needed:
   *  · native `required` on the child, for the constraint the browser enforces;
   *  · `aria-required`, because Select's trigger is a <button> and DateField's
   *    is a composite, and native `required` means nothing on either;
   *  · a WORD in the visible <label>, so it is in the accessible name. Not an
   *    asterisk and not a colour — a bare `*` is unpronounced by some AT and
   *    meaningless to anyone who has not been told the convention, and colour
   *    alone is 1.4.1.
   */
  required?: boolean;
  children: (props: {
    id: string;
    /** Native `required`, and a real attribute on a real control — see the prop. */
    required?: boolean;
    /**
     * The error state, and the ONLY channel that carries it to a control
     * (1.10.0). `className` cannot: `border-bad` from here and a control's own
     * `border-line-control` both land on the element, `cn` is a plain join so
     * neither wins on specificity, and the cascade picks the grey. That is how
     * a field came to be announced invalid and drawn valid — one red sentence
     * under a form of five controls, and no red control.
     *
     * Select and DateField escalate off THIS attribute, at
     * `:enabled[aria-invalid="true"]` — specificity (0,3,0), which a caller's
     * (0,1,0) class cannot tie, so the fix does not depend on `cn` or on emit
     * order. A real ARIA attribute was chosen over a bespoke `invalid` prop for
     * one reason: apps write `<input {...props} />`, and a non-DOM prop makes
     * React log "Received `true` for a non-boolean attribute" for every native
     * control in error. This spreads onto anything.
     */
    "aria-invalid"?: boolean;
    "aria-required"?: boolean;
    "aria-describedby"?: string;
    className: string;
  }) => React.ReactNode;
}

/**
 * Validation/error placement is a system decision, not a per-form one:
 * label above, control, hint OR error below (error wins).
 */
export function FormField({
  id,
  label,
  hint,
  error,
  size = "md",
  required = false,
  children,
}: FormFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  // THE ERROR IS ALSO A STATUS MESSAGE, AND UNTIL 1.10.0 IT WAS ONLY A
  // DESCRIPTION. `aria-describedby` below is correct and stays — but a
  // description is spoken when you ENTER the field, so an operator who types a
  // wrong confirmation and tabs on hears nothing at all, while the sighted
  // operator watches red appear (WCAG 4.1.3 Status Messages, AA). Traced on one
  // consumer's /pin: `aria-invalid` and `aria-describedby` both landed, the
  // error span was inserted with `role: null, aria-live: null`, and the page's
  // own live regions stayed empty.
  //
  // `seq` is why this is a state pair rather than just rendering {error} into a
  // region. The region must be MOUNTED FROM FIRST RENDER AND EMPTY — a live
  // region that appears at the same instant it gains text is not reliably
  // announced, which is also why `role="alert"` on the visible span is the
  // weaker fix — and the seq keys its child so that an error which is cleared
  // and set again to the same string replaces a DOM node rather than
  // reconciling to no change at all. Same pattern the first consuming app
  // arrived at for its live board, and for the same reason.
  //
  // Assigning during render (React's documented "adjust state when a prop
  // changes"): the alternative is useEffect, which announces one paint LATE,
  // and this region is the whole point.
  const [live, setLive] = React.useState({ seq: 0, text: "", from: error });
  if (live.from !== error) {
    // Deliberately NOT announced on mount — `from` is seeded with the incoming
    // error, so a field that renders already invalid (a server-rendered form
    // coming back with five of them) says nothing. That is not news; it is the
    // state of the page, and `aria-describedby` covers it.
    setLive({ seq: live.seq + 1, text: error ?? "", from: error });
  }
  return (
    <div className="flex max-w-[340px] flex-col gap-1.5">
      <label htmlFor={id} className="text-ribbon-meta font-medium text-muted">
        {label}
        {required ? (
          // Inside the <label>, so it is part of the control's accessible name
          // and not a separate thing to go and find. text-faint, the same tier
          // as the hint below, because it is an annotation on the label rather
          // than a second label. The space is a real character rather than a
          // margin: name computation concatenates text nodes and is not
          // required to insert one at an element boundary, so a margin would
          // read correctly and announce "First day off(required)".
          <span className="font-normal text-faint">{" (required)"}</span>
        ) : null}
      </label>
      {children({
        id,
        required: required || undefined,
        "aria-invalid": error ? true : undefined,
        // Alongside native `required`, not instead of it — see the prop.
        "aria-required": required || undefined,
        "aria-describedby": describedBy,
        className: cn(
          CONTROL_HEIGHT[size],
          size === "tap" ? "px-3" : "px-2.5",
          "rounded-sm border-chip bg-card text-control text-ink",
          // NO FOCUS TREATMENT HERE — the same removal as select.tsx and
          // date-field.tsx, and the worst-placed of the three: this string is
          // HANDED TO THE APP and spread onto whatever control it renders, so
          // the outline-suppressing half travelled out of this package and onto
          // every consumer's own inputs, textareas and selects. It was inert only
          // because `.e911-app :focus-visible` in tokens.css is UNLAYERED and
          // therefore outranks a utility; layer that rule, or let an app declare
          // its own @layer order, and every FormField control in every E911 app
          // loses its keyboard focus indicator at once (WCAG 2.4.7) with no
          // error to say so. The system draws one two-tone indicator; a field
          // does not get a second, and does not get to suppress the first.
          //
          // --border-control, not --border-default: a field's stroke is the only
          // thing marking it (bg-card input inside a bg-card card), so 1.4.11
          // wants 3:1 there and 1.31:1 was what shipped. See tokens.css.
          error ? "border-bad" : "border-line-control"
        ),
      })}
      {error ? (
        <span id={`${id}-error`} className="text-meta font-medium text-bad">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="text-meta text-faint">
          {hint}
        </span>
      ) : null}
      {/* MOUNTED HERE ON EVERY RENDER AND EMPTY UNTIL THERE IS NEWS — see the
          note above; moving it inside the `error ?` branch above would recreate
          exactly the defect it fixes. The label rides along because a polite
          region is heard out of context: "Those do not match." on a form of
          five controls does not say which one, and the reader has by then
          tabbed away from it. */}
      <span role="status" aria-live="polite" className="sr-only">
        <span key={live.seq}>{live.text ? `${label}: ${live.text}` : ""}</span>
      </span>
    </div>
  );
}
