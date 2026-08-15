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

/* ------------------------------------------------------------- DomainCard */
export interface DomainCardProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  edge: EdgeColor; // keyed by domain — see DOMAIN_EDGE in core
  /** Card header. When set, children render below a divider with no padding
      collapse — use for tables. */
  title?: React.ReactNode;
  headerRight?: React.ReactNode;
  /** Remove body padding (tables want edge-to-edge). */
  flush?: boolean;
}

export function DomainCard({
  edge,
  title,
  headerRight,
  flush = false,
  className,
  children,
  ...rest
}: DomainCardProps) {
  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded border border-line bg-card shadow-card",
        "border-t-edge", // 4px top border width
        edgeClass[edge],
        className
      )}
      {...rest}
    >
      {title != null && (
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <h3 className="font-display text-h3 tracking-[-0.01em]">{title}</h3>
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
  empty?: React.ReactNode;
  "aria-label"?: string;
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  onRowClick,
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
        {rows.map((row) => (
          <tr
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn(
              "border-b border-line-row last:border-b-0",
              onRowClick && "cursor-pointer transition duration-fast hover:bg-tint"
            )}
          >
            {columns.map((c) => (
              <td
                key={c.key}
                className={cn(
                  "h-row px-4 align-middle text-table",
                  c.align === "right" && "text-right"
                )}
              >
                {c.cell(row)}
              </td>
            ))}
          </tr>
        ))}
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
