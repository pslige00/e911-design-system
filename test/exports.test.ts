import { describe, expect, it } from "vitest";
import * as ds from "../src/index";

/**
 * The package's public surface, spelled out.
 *
 * This is the cheapest gate in the suite and it catches the one mistake nothing
 * else here would: an export dropped or renamed during a refactor. Every other
 * file imports the names it needs, so a rename that lands consistently across
 * this repo type-checks, tests green, and breaks in the consuming app at
 * `import { Foo } from "@e911/design-system"` — which is a git dependency
 * pinned by tag, so the app finds out at `npm ci` in a container build.
 *
 * Adding an export is a one-line edit here. That is deliberate: it makes the
 * public surface something a reviewer sees change.
 */
const EXPECTED = [
  "AppShell",
  "Button",
  "Callout",
  "CertChip",
  "Checkbox",
  "Chip",
  "DOMAIN_EDGE",
  "DangerDialog",
  "DataTable",
  "DateField",
  "Dialog",
  "DomainCard",
  "EmptyState",
  "FormField",
  "KpiCard",
  "Pagination",
  "RAIL_PINNED_STORAGE_KEY",
  "RAIL_PIN_LABEL",
  "Radio",
  "RailAction",
  "Ribbon",
  "RibbonButton",
  "Select",
  "Skeleton",
  "SkipLink",
  "StatusTag",
  "TabPanel",
  "Tabs",
  "ToastProvider",
  "Tooltip",
  "cn",
  "formatIsoDate",
  "paginationSlots",
  "parseIsoDate",
  "todayIsoDate",
  "useToast",
];

describe("package exports", () => {
  it("exports exactly the documented runtime surface", () => {
    expect(Object.keys(ds).sort()).toEqual(EXPECTED.sort());
  });

  it("defines every one of them", () => {
    for (const name of EXPECTED) {
      expect(ds[name as keyof typeof ds], name).toBeDefined();
    }
  });
});
