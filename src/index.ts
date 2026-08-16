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
