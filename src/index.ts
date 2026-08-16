// Data first, and from "./contract" rather than "./core" — routing these through
// a "use client" module hands server components a client-reference proxy instead
// of the actual value, which breaks DomainCard's hue silently. See contract.ts.
export { cn, DOMAIN_EDGE, RAIL_PINNED_STORAGE_KEY, RAIL_PIN_LABEL } from "./contract";
export type { Tone, EdgeColor, ControlSize } from "./contract";

export { Button, Chip, StatusTag, CertChip } from "./core";
export type { ButtonProps, ChipProps, StatusTagProps, CertChipProps } from "./core";
export { AppShell, RailAction, Ribbon, RibbonButton, SkipLink } from "./shell";
export type {
  AppShellProps,
  RailItem,
  RailActionProps,
  RailLinkRenderer,
  RibbonProps,
  SkipLinkProps,
} from "./shell";
export { DomainCard, KpiCard, DataTable, FormField } from "./data";
export type {
  DomainCardProps,
  KpiCardProps,
  CellContext,
  Column,
  DataTableProps,
  RowLinkRenderer,
  FormFieldProps,
} from "./data";
// The two states a screen is in before it has anything to show. Neither
// existed until 1.7.0, which is why every consuming screen either invented an
// empty state or shipped a header row over a void, and why a table that was
// still fetching looked exactly like a table with nothing in it. Unlike
// everything else exported here, feedback.tsx carries no "use client" — a
// server page can render an EmptyState without a client wrapper. See the note
// at the top of that file.
export { EmptyState, Skeleton } from "./feedback";
export type { EmptyStateProps, SkeletonProps } from "./feedback";
// The inline message a screen attaches to a region of itself. The first
// consuming app hand-rolled 22 of them across seven files — six sharing one
// class string, three carrying a live region — which is why a dispatcher on a
// screen reader was told nothing when a warning appeared. `kind` is the prop to
// read first: it says whether the message is standing or news, which is the one
// thing neither the component nor the tone can work out. Like feedback.tsx,
// callout.tsx carries no "use client", so a server page can render a standing
// notice directly.
export { Callout } from "./callout";
export type { CalloutProps } from "./callout";
// The boolean controls. Self-labelling — the label is a CHILD and part of the
// hit area, which is why they are not FormField children. See SKILL.md.
export { Checkbox, Radio } from "./choice";
export type { CheckboxProps, RadioProps } from "./choice";
export { Dialog, DangerDialog } from "./dialog";
export type { DialogProps, DangerDialogProps } from "./dialog";
export { Select } from "./select";
export type { SelectProps, SelectOption } from "./select";
export { Tabs, TabPanel } from "./tabs";
export type { TabsProps, TabItem, TabPanelProps } from "./tabs";
export { ToastProvider, useToast } from "./toast";
export type { ToastProviderProps, ToastOptions } from "./toast";
export { DateField, parseIsoDate, formatIsoDate, todayIsoDate } from "./date-field";
export type {
  DateFieldProps,
  DateFieldRejection,
  DateFieldRejectionReason,
} from "./date-field";
export { Pagination, paginationSlots } from "./pagination";
export type { PaginationProps } from "./pagination";
export { Tooltip } from "./tooltip";
export type { TooltipProps, TooltipPlacement } from "./tooltip";
