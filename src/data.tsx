"use client";

import * as React from "react";
import { cn, type EdgeColor, type Tone } from "./core";

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
        <span className="mt-1 flex items-center gap-1.5 text-[11.5px] text-muted">
          {delta ? (
            <span
              className={cn(
                "rounded-[6px] px-1.5 py-px font-mono text-[10px] font-medium",
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
export interface Column<Row> {
  key: string;
  header: React.ReactNode;
  cell: (row: Row) => React.ReactNode;
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
  empty?: React.ReactNode;
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
  renderLink,
  rowClickable,
  empty,
  ...rest
}: DataTableProps<Row>) {
  if (rows.length === 0 && empty) {
    return <div className="px-4 py-9 text-center text-[12.5px] text-muted">{empty}</div>;
  }
  return (
    <table className="w-full border-collapse" {...rest}>
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
                "text-[10.5px] font-semibold uppercase tracking-[0.06em] text-faint",
                c.align === "right" ? "text-right" : "text-left"
              )}
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const active = rowClickable ? rowClickable(row) : true;
          const href = active && rowHref ? rowHref(row) : undefined;
          const interactive = active && (href != null || onRowClick != null);
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
              {columns.map((c, i) => {
                const content = c.cell(row);
                // The link wraps the first column's content, so the row has one
                // tab stop named after its subject.
                const body =
                  href != null && i === 0
                    ? renderLink
                      ? renderLink({ href, className: rowLinkClass, children: content })
                      : <a href={href} className={rowLinkClass}>{content}</a>
                    : content;
                return (
                  <td
                    key={c.key}
                    className={cn(
                      "h-row px-4 align-middle text-table",
                      c.align === "right" && "text-right"
                    )}
                  >
                    {body}
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* -------------------------------------------------------------- FormField */
export interface FormFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string; // when set: red border, red hint, aria-invalid
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
export function FormField({ id, label, hint, error, children }: FormFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex max-w-[340px] flex-col gap-1.5">
      <label htmlFor={id} className="text-[12.5px] font-medium text-muted">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        className: cn(
          "h-ctl rounded-sm border-chip bg-card px-2.5 text-[13px] text-ink",
          "focus:outline-none focus:border-[var(--focus-ring)]",
          "focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--focus-ring)_20%,transparent)]",
          error ? "border-bad" : "border-line"
        ),
      })}
      {error ? (
        <span id={`${id}-error`} className="text-[11.5px] font-medium text-bad">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="text-[11.5px] text-faint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
