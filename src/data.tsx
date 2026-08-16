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

/* ------------------------------------------------------------- DomainCard */
export interface DomainCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  edge: EdgeColor; // keyed by domain — see DOMAIN_EDGE in core
  /** Card header. When set, children render below a divider with no padding
      collapse — use for tables. */
  title?: React.ReactNode;
  /**
   * Heading rung for `title`. Defaults to 3, which is what this component
   * hard-coded until 1.4.0 — and which no page could make correct: a Ribbon
   * renders the page's h1, so a card under it jumped h1 → h3 with no h2 on
   * every screen in every app. The first consumer bridged it with `sr-only`
   * <h2>s of its own, which works and which the next app would have had to
   * invent again. Say what rung the card actually sits on instead.
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
  titleLevel = 3,
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
  return (
    <section
      // An app-supplied name wins: a card titled "Open" on a page of them may
      // need to say which queue it belongs to.
      aria-labelledby={ariaLabelledBy ?? (title != null && !ariaLabel ? titleId : undefined)}
      aria-label={ariaLabel}
      className={cn(
        // rounded-md, not bare `rounded`: the bare utility reads Tailwind v4's
        // deprecated --radius key, which is one more thing that has to be right.
        "min-w-0 overflow-hidden rounded-md border border-line bg-card shadow-card",
        "border-t-edge", // 4px top border width
        edgeClass[edge],
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
                "rounded-xs px-1.5 py-px font-mono text-badge font-medium",
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

         tabIndex + role + name are the accessibility half, and they are not
         optional decoration: a region that scrolls is content a keyboard user
         must be able to reach, and a container that only a pointer can pan is
         a 2.1.1 failure on the same grounds this component already refused to
         let `onRowClick` navigate a row. Naming the region duplicates the
         table's own name by design — "Exception queue region", then "Exception
         queue table" — which is what a <caption> would give if this component
         had one, and an anonymous tab stop is worse than a repeated word.

         NO FOCUS RING HERE. tokens.css draws one indicator for the whole
         system; a local ring is how one control ends up with a different one.
         (It is also unlayered CSS, so a utility could not win against it
         anyway — see the border-radius note in tokens.css.)

         WATCH OUT if a sticky header is ever added: `overflow-x: auto` makes
         this a scroll container on BOTH axes, because CSS resolves the other
         axis's `visible` to `auto`. A `position: sticky` thead would then stick
         to this box rather than to the viewport, and this box never scrolls
         vertically — so the header would simply stop sticking, silently. */
      tabIndex={0}
      role="region"
      // Falls back to a generic name rather than going unnamed: role="region"
      // with no accessible name is not exposed as a landmark at all (the same
      // trap DomainCard's <section> was in), and the fallback at least tells a
      // keyboard user what they have landed on. Pass `aria-label`.
      aria-label={rest["aria-label"] ?? "Table"}
      className="overflow-x-auto"
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
  children: (props: {
    id: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
    className: string;
  }) => React.ReactNode;
}

/**
 * Validation/error placement is a system decision, not a per-form one:
 * label above, control, hint OR error below (error wins).
 */
export function FormField({ id, label, hint, error, size = "md", children }: FormFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex max-w-[340px] flex-col gap-1.5">
      <label htmlFor={id} className="text-ribbon-meta font-medium text-muted">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
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
    </div>
  );
}
