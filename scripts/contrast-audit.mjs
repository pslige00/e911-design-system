#!/usr/bin/env node
/* ============================================================================
   E911 DESIGN SYSTEM — contrast audit
   Run: npm run audit:contrast   (also runs as part of `npm test`)

   WHY THIS FILE EXISTS
   The system states WCAG 2.1 AA as a hard floor, but until 1.1.2 the only thing
   enforcing it was a person reading ratios off a comment in tokens.css. Those
   comments went stale: --text-tertiary was annotated "labels >=12px semibold
   only" and shipped at 3.21:1 on --surface-sunken, which is a fail at ANY size.
   A UAT tester found it by measuring computed styles in a browser, which is not
   a control — it is luck. This script reads tokens.css directly (never a copy),
   resolves the var() chains for both themes, and fails the build on any pair
   below its threshold. If a token value moves, this is what notices.

   It parses tokens.css rather than importing a JS mirror on purpose: a mirror is
   a second source of truth and would drift exactly the way the comments did.
   ========================================================================== */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const TOKENS = resolvePath(here, "../tokens/tokens.css");

/* ---------------------------------------------------------------- parsing */

/**
 * Pull custom-property declarations out of the selector blocks we care about.
 * Deliberately dumb: tokens.css is a flat file of `--name: value;` lines with no
 * nesting, and a real CSS parser would be a dependency this package does not have.
 */
function readBlocks(css) {
  const light = new Map(); // :root and :root, [data-theme="light"]
  const dark = new Map(); // [data-theme="dark"]

  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = blockRe.exec(css)) !== null) {
    const selector = m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim();
    const body = m[2];
    let target = null;
    if (/\[data-theme="dark"\]/.test(selector)) target = dark;
    else if (/(^|,)\s*:root/.test(selector)) target = light;
    if (!target) continue;

    const declRe = /(--[\w-]+)\s*:\s*([^;]+);/g;
    let d;
    while ((d = declRe.exec(body)) !== null) {
      target.set(d[1], d[2].replace(/\/\*[\s\S]*?\*\//g, "").trim());
    }
  }
  return { light, dark };
}

const css = readFileSync(TOKENS, "utf8");
const { light, dark } = readBlocks(css);

/** Resolve a token name (or raw value) to a literal, following var() chains. */
function resolveToken(name, theme) {
  const scope = theme === "dark" ? dark : light;
  const seen = new Set();
  let value = scope.get(name) ?? light.get(name);
  while (value != null) {
    const ref = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value.trim());
    if (!ref) return value.trim();
    if (seen.has(ref[1])) throw new Error(`circular var chain at ${ref[1]}`);
    seen.add(ref[1]);
    value = scope.get(ref[1]) ?? light.get(ref[1]);
  }
  throw new Error(`unresolved token ${name} (${theme})`);
}

/* ------------------------------------------------------------------ color */

function parseColor(input) {
  const s = String(input).trim();
  let m = /^#([0-9a-f]{3})$/i.exec(s);
  if (m) {
    const [r, g, b] = m[1].split("").map((c) => parseInt(c + c, 16));
    return { r, g, b, a: 1 };
  }
  m = /^#([0-9a-f]{6})$/i.exec(s);
  if (m) {
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  m = /^rgba?\(([^)]+)\)$/i.exec(s);
  if (m) {
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  throw new Error(`cannot parse color: ${s}`);
}

/** Flatten a translucent color onto an opaque one. The soft status fills and
    --surface-brand-soft are rgba() in dark, so skipping this would score them
    against their own unpainted alpha and read far too optimistic. */
function over(fg, bg) {
  if (fg.a >= 1) return fg;
  return {
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  };
}

function relativeLuminance({ r, g, b }) {
  const f = (v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const hex = ({ r, g, b }) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0").toUpperCase()).join("");

/** Color stops of a linear-gradient, with positions, so a run can be sampled
    anywhere rather than only at whichever point someone happened to screenshot. */
function gradientStops(value) {
  const inner = /linear-gradient\(([\s\S]*)\)/.exec(value)?.[1] ?? "";
  const parts = inner
    .split(",")
    .map((p) => p.trim())
    .filter((p) => /#|rgba?\(/i.test(p));
  const stops = parts.map((p, i) => ({
    color: /(#[0-9a-f]{3,8}|rgba?\([^)]*\))/i.exec(p)[1],
    pos: (() => {
      const pct = /(-?[\d.]+)%/.exec(p);
      if (pct) return Number(pct[1]) / 100;
      if (i === 0) return 0;
      if (i === parts.length - 1) return 1;
      return null; // filled in below
    })(),
  }));
  // CSS distributes unpositioned stops evenly between their positioned neighbours.
  for (let i = 0; i < stops.length; i++) {
    if (stops[i].pos !== null) continue;
    let prev = i - 1;
    let next = i + 1;
    while (stops[next].pos === null) next++;
    const span = stops[next].pos - stops[prev].pos;
    stops[i].pos = stops[prev].pos + (span * (i - prev)) / (next - prev);
  }
  return stops;
}

/** Sample a gradient at fraction t of its line, interpolating in sRGB (what CSS
    does for a legacy sRGB gradient). */
function gradientAt(stops, t) {
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (t >= a.pos && t <= b.pos) {
      const k = b.pos === a.pos ? 0 : (t - a.pos) / (b.pos - a.pos);
      const ca = parseColor(a.color);
      const cb = parseColor(b.color);
      return {
        r: ca.r + (cb.r - ca.r) * k,
        g: ca.g + (cb.g - ca.g) * k,
        b: ca.b + (cb.b - ca.b) * k,
        a: 1,
      };
    }
  }
  return parseColor(stops[stops.length - 1].color);
}

/** The painted ground at t: the gradient, then every scrim over it in order. */
function groundAt(stops, scrims, t) {
  let bg = gradientAt(stops, t);
  for (const s of scrims) bg = over(parseColor(s), bg);
  return bg;
}

/** Worst contrast anywhere in [from, to] of the gradient line. `scrims` is a
    LIST because the ribbon stacks them: the actions slot's plate, and then a
    ghost button's hover fill on top of it. */
function worstOverZone(stops, fgRaw, scrims, from, to) {
  let worst = Infinity;
  let at = from;
  for (let t = from; t <= to + 1e-9; t += 0.01) {
    const bg = groundAt(stops, scrims, t);
    const fg = over(parseColor(fgRaw), bg);
    const r = contrast(fg, bg);
    if (r < worst) {
      worst = r;
      at = t;
    }
  }
  return { ratio: worst, at, bg: groundAt(stops, scrims, at) };
}

/**
 * A TWO-TONE indicator is scored differently from a single colour: the question
 * is whether the operator can see it, so the better of its two bands against
 * the surface is what counts. Scoring the halo alone would report a failure on
 * every dark surface, where it is invisible by design and the bright ring is
 * doing the work — and "add a waiver" would be the wrong answer to that.
 * The two tones must also be legible against EACH OTHER, or the pair collapses
 * into one band on a surface that swallows either.
 */
function bestOfPair(aRaw, bRaw, bg) {
  const a = over(parseColor(aRaw), bg);
  const b = over(parseColor(bRaw), bg);
  return Math.max(contrast(a, bg), contrast(b, bg));
}

/* -------------------------------------------------------------- threshold */

/** WCAG 2.1: large text is >=18pt (24px) or >=14pt bold (18.66px). Anything
    below that is small text and owes 4.5:1 no matter how "label-like" it looks
    — which is the exact assumption that produced the 3.21:1 column header. */
function thresholdFor({ px, weight, kind }) {
  if (kind === "ui") return 3;
  if (kind === "disabled") return 0; // 1.4.3 exempts disabled controls
  if (kind === "logotype") return 0; // 1.4.3 exempts text that is part of a logo
  const large = px >= 24 || (px >= 18.66 && weight >= 700);
  return large ? 3 : 4.5;
}

/**
 * Known-open items: measured, below threshold, and deliberately NOT changed in
 * this pass. Each records the ratio it had when it was waived, and the audit
 * fails if the real ratio drops below that — so a waiver freezes a problem in
 * place instead of licensing it to get worse. It also fails if the pair starts
 * passing, which is the prompt to delete the entry.
 *
 * Waiving is only honest with a reason that survives being read aloud. These
 * are all SC 1.4.11 (non-text contrast) on borders, and 1.4.11 applies to
 * boundaries REQUIRED to identify a control — it exempts a boundary when the
 * component is identifiable another way. Judged individually:
 */
const WAIVED = {
  // Cards and row rules are separation, not identification: a DomainCard is
  // identified by its 4px domain edge (>=3:1 in both themes), and a table row by
  // its content and its hover.
  //
  // 1.4.0 lifted the DARK values (row 1.13 -> 1.46, card 1.32 -> 1.86 on card)
  // after measuring them on painted pixels, and the reason is worth keeping:
  // the old waiver said cards are identified by "domain edge + surface", but in
  // dark --surface-card is 1.09:1 against --surface-canvas, so the surface half
  // of that sentence is false and the border was carrying it. They stay waived
  // because 3:1 here means a ~#6E6055 rule on #1E1814, which turns a 350-row
  // table into a spreadsheet grid — a different design, not a fixed one.
  "Card border": "separation, not identification; lifted in 1.4.0, 3:1 would be a grid",
  "Row rule": "separation, not identification; lifted in 1.4.0, 3:1 would be a grid",
  // The secondary button has a visible label and a 3:1 hover/focus state, so
  // its resting stroke is not the sole identifier.
  "Secondary button border": "labelled control; focus ring and hover carry the state",
  //
  // "Input border" was the fourth entry here from 1.1.2 to 1.4.0, and it was
  // the honest one: an input is `bg-card` inside a card that is ALSO `bg-card`,
  // so at 1.31:1 the stroke was genuinely the only thing marking the field.
  // 1.5.0 shipped the fix its own waiver recommended — a dedicated
  // --border-control (3.38:1 light, 3.27:1 dark) used by the input, the Select
  // trigger and DateField, leaving --border-default to the dividers. The row
  // below now measures that token and passes, so the entry is gone rather than
  // retired in place: a waiver kept past its fix hides the next regression.
};

/* ------------------------------------------------------------------ pairs */

/**
 * Every semantic foreground/background pair the system actually paints, with the
 * real size and weight from the component that paints it. `bg` may be a list:
 * a role that can sit on several surfaces is scored against all of them and
 * judged on the worst, because that is the one a dispatcher ends up reading.
 */
const PAIRS = [
  // ---- body / structural text -------------------------------------------
  { role: "Body text", where: ".e911-app", fg: "--text-primary", bg: ["--surface-canvas", "--surface-card", "--surface-sunken", "--surface-tint"], px: 13.5, weight: 400 },
  { role: "Table cell", where: "DataTable td", fg: "--text-primary", bg: ["--surface-card", "--surface-tint"], px: 12.8, weight: 400 },
  { role: "Card title", where: "DomainCard h3", fg: "--text-primary", bg: ["--surface-card"], px: 14.5, weight: 700 },
  { role: "KPI numeral", where: "KpiCard b", fg: "--text-primary", bg: ["--surface-card"], px: 25, weight: 700 },
  { role: "Input value", where: "FormField / Select / DateField", fg: "--text-primary", bg: ["--surface-card"], px: 13, weight: 400 },
  { role: "Tooltip text", where: "Tooltip", fg: "--text-primary", bg: ["--surface-card"], px: 12, weight: 500 },

  // ---- secondary --------------------------------------------------------
  { role: "Field label", where: "FormField label", fg: "--text-secondary", bg: ["--surface-card"], px: 12.5, weight: 500 },
  { role: "Quiet button", where: "Button variant=quiet", fg: "--text-secondary", bg: ["--surface-card", "--surface-canvas", "--surface-tint"], px: 13.5, weight: 500 },
  { role: "Chip (inactive)", where: "Chip / CertChip", fg: "--text-secondary", bg: ["--surface-card"], px: 12, weight: 500 },
  { role: "Tab (inactive)", where: "Tabs", fg: "--text-secondary", bg: ["--surface-canvas", "--surface-card"], px: 13.5, weight: 500 },
  { role: "KPI sub / delta", where: "KpiCard", fg: "--text-secondary", bg: ["--surface-card", "--surface-tint"], px: 11.5, weight: 400 },
  { role: "Empty state", where: "DataTable empty", fg: "--text-secondary", bg: ["--surface-card"], px: 12.5, weight: 400 },
  // The rail is `bg-card` collapsed AND expanded, so the label's ground is the
  // same pair in both states — there is no "expanded rail colour" to get wrong.
  // Icon and label are one colour: the label is TEXT and owes 4.5:1, and the
  // icon used to be --text-tertiary, which would have made a nav row two tones.
  { role: "Rail item label", where: "AppShell rail (idle)", fg: "--text-secondary", bg: ["--surface-card"], px: 13.5, weight: 500 },
  { role: "Rail item (hover)", where: "AppShell rail:hover", fg: "--text-primary", bg: ["--surface-tint"], px: 13.5, weight: 500 },
  { role: "Dialog description", where: "Dialog", fg: "--text-secondary", bg: ["--surface-card"], px: 12.5, weight: 400 },
  { role: "Calendar nav arrows", where: "DateField", fg: "--text-secondary", bg: ["--surface-card"], kind: "ui" },

  // ---- tertiary — the tier the UAT defect was found in --------------------
  { role: "Table column header", where: "DataTable th", fg: "--text-tertiary", bg: ["--surface-sunken"], px: 10.5, weight: 600 },
  { role: "KPI label", where: "KpiCard label", fg: "--text-tertiary", bg: ["--surface-card"], px: 11, weight: 600 },
  { role: "Field hint", where: "FormField hint", fg: "--text-tertiary", bg: ["--surface-card"], px: 11.5, weight: 400 },
  { role: "Select placeholder", where: "Select", fg: "--text-tertiary", bg: ["--surface-card"], px: 13, weight: 400 },
  { role: "Select empty list", where: "Select", fg: "--text-tertiary", bg: ["--surface-card"], px: 12.5, weight: 400 },
  { role: "Calendar weekday head", where: "DateField", fg: "--text-tertiary", bg: ["--surface-card"], px: 11, weight: 600 },
  { role: "Calendar outside day", where: "DateField", fg: "--text-tertiary", bg: ["--surface-card", "--surface-tint"], px: 12, weight: 400 },
  { role: "Pagination ellipsis", where: "Pagination", fg: "--text-tertiary", bg: ["--surface-canvas", "--surface-card"], px: 12.5, weight: 400 },
  { role: "Dismiss icon", where: "Dialog / Toast", fg: "--text-tertiary", bg: ["--surface-card"], kind: "ui" },
  { role: "Select chevron", where: "Select", fg: "--text-tertiary", bg: ["--surface-card"], kind: "ui" },
  { role: "Calendar disabled day", where: "DateField", fg: "--text-tertiary", bg: ["--surface-card"], kind: "disabled" },

  // ---- brand / action ---------------------------------------------------
  { role: "Brand text link", where: "Chip active / Tabs active", fg: "--text-brand", bg: ["--surface-card", "--surface-brand-soft"], px: 12, weight: 600 },
  // Active destination, and the pin while pressed — same treatment, so one row.
  { role: "Rail item (active/pinned)", where: "AppShell rail", fg: "--text-brand", bg: ["--surface-brand-soft"], px: 13.5, weight: 600 },
  { role: "Primary button label", where: "Button variant=primary", fg: "--text-on-action", bg: ["--action-primary"], px: 13.5, weight: 600 },
  { role: "Primary button label (hover)", where: "Button variant=primary:hover", fg: "--text-on-action", bg: ["--action-primary-hover"], px: 13.5, weight: 600 },
  { role: "Danger button label", where: "Button variant=danger", fg: "--text-on-danger", bg: ["--status-bad"], px: 13.5, weight: 600 },
  // The ribbon's primary action is an OPAQUE pill, so it is scored against its
  // own surface, not the gradient. Both halves are tokens precisely so this row
  // measures what ships — the pill was `bg-white` with a themed label.
  { role: "Ribbon primary action", where: "RibbonButton variant=primary", fg: "--ribbon-action-text", bg: ["--ribbon-action-surface"], px: 12.5, weight: 700 },
  { role: "Rail seal", where: "AppShell 911 badge", fg: "#FFFFFF", bg: ["--e911-brand"], kind: "logotype" },
  { role: "Active tab underline", where: "Tabs", fg: "--action-primary", bg: ["--surface-canvas", "--surface-card", "--surface-tint"], kind: "ui" },
  // The ring's own band, on the flat surfaces. The pair check below is the one
  // that covers the gradient; this row keeps the brand tone honest on its own
  // where it is the band doing the work.
  { role: "Focus ring", where: ":focus-visible", fg: "--focus-ring", bg: ["--surface-canvas", "--surface-card", "--surface-sunken", "--surface-tint"], kind: "ui" },

  // ---- status -----------------------------------------------------------
  { role: "StatusTag ok", where: "StatusTag", fg: "--status-ok", bg: ["--status-ok-soft"], px: 11, weight: 600 },
  { role: "StatusTag warn", where: "StatusTag", fg: "--status-warn", bg: ["--status-warn-soft"], px: 11, weight: 600 },
  { role: "StatusTag bad", where: "StatusTag", fg: "--status-bad", bg: ["--status-bad-soft"], px: 11, weight: 600 },
  { role: "CertChip warn", where: "CertChip", fg: "--status-warn", bg: ["--status-warn-soft"], px: 10, weight: 400 },
  { role: "CertChip bad", where: "CertChip", fg: "--status-bad", bg: ["--status-bad-soft"], px: 10, weight: 400 },
  { role: "Field error text", where: "FormField error", fg: "--status-bad", bg: ["--surface-card"], px: 11.5, weight: 500 },

  // ---- boolean controls (1.6.0) -----------------------------------------
  // A Checkbox or Radio is the one control in this system whose whole meaning
  // is carried by non-text: an unchecked box is a stroke, a checked one is a
  // fill plus a mark. All four rows are 1.4.11 (3:1), and all four are scored
  // on every surface the control is actually painted on — card (inside a
  // DomainCard), canvas (a bare form on the page), sunken (a select-all in a
  // table head). --surface-tint is NOT in the list and the omission is
  // deliberate rather than convenient: it is a hover/quiet fill, no component
  // paints a control on it, and --border-control measures 2.90:1 light /
  // 2.96:1 dark there. If a component ever does put a box on tint, this is the
  // list to add it to, and it will fail — which is the point.
  { role: "Checkbox box (unchecked)", where: "Checkbox / Radio", fg: "--border-control", bg: ["--surface-card", "--surface-canvas", "--surface-sunken"], kind: "ui" },
  { role: "Checkbox fill (checked)", where: "Checkbox / Radio :checked", fg: "--action-primary", bg: ["--surface-card", "--surface-canvas", "--surface-sunken"], kind: "ui" },
  // The tick, the indeterminate dash and the radio's dot are one pair: the mark
  // on the fill it is drawn on. Same tokens as the primary button's label, and
  // measured separately because a 2.4px stroke is not a 13.5px word.
  { role: "Checkbox mark", where: "Checkbox tick / dash / Radio dot", fg: "--text-on-action", bg: ["--action-primary"], kind: "ui" },
  { role: "Checkbox box (invalid)", where: "Checkbox invalid", fg: "--status-bad", bg: ["--surface-card", "--surface-canvas"], kind: "ui" },

  // ---- borders (1.4.11: only boundaries that IDENTIFY a control) ---------
  // The one border tier that IDENTIFIES rather than separates, and therefore
  // the one 1.4.11 actually asks 3:1 of. Its own token since 1.5.0.
  { role: "Input border", where: "FormField / Select / DateField", fg: "--border-control", bg: ["--surface-card"], kind: "ui" },
  { role: "Secondary button border", where: "Button variant=secondary", fg: "--border-strong", bg: ["--surface-card"], kind: "ui" },
  { role: "Card border", where: "DomainCard", fg: "--border-default", bg: ["--surface-canvas"], kind: "ui" },
  { role: "Row rule", where: "DataTable tr", fg: "--border-row", bg: ["--surface-card"], kind: "ui" },
];

/**
 * Ribbon text sits ON the gradient, so each role is scored across the stretch of
 * the run it can actually occupy — not just at the stops, and not at one
 * convenient point. `zone` is [from, to] as a fraction of the gradient line.
 *
 * Scoring every role against every stop would be the easy version and it is
 * wrong in both directions: it reports phantom failures for the left-aligned
 * heading (which never reaches the gold terminus) and would have said nothing
 * useful about WHERE the real failure is. The heading, eyebrow and subtitle are
 * left-aligned inside the ribbon's padding; only `actions` is right-aligned.
 * The zones are deliberately generous — the gradient runs at 115deg, so on a
 * short wide ribbon the line is close to horizontal and these bracket the text.
 */
const RIBBON = [
  { role: "Ribbon eyebrow", px: 10.5, weight: 600, zone: [0, 0.55] },
  { role: "Ribbon h1", px: 24, weight: 700, zone: [0, 0.55] },
  { role: "Ribbon subtitle", px: 12.5, weight: 400, zone: [0, 0.55] },
  // Everything right-aligned sits on the actions slot's plate. The zone runs to
  // the very end of the gradient because the slot's x depends on the page's own
  // content length and the browser window — measured across 1024/1440/1920, the
  // cluster lands anywhere from 60% to the right edge.
  { role: "Ribbon actions text", px: 12.5, weight: 400, zone: [0.55, 1], scrims: ["--ribbon-actions-scrim"] },
  { role: "Ribbon ghost button", px: 12.5, weight: 600, zone: [0.55, 1], scrims: ["--ribbon-actions-scrim"] },
  // Hover DEEPENS the plate rather than lightening it; both scrims composite.
  { role: "Ribbon ghost button (hover)", px: 12.5, weight: 600, zone: [0.55, 1], scrims: ["--ribbon-actions-scrim", "--ribbon-ghost-hover"] },
];

/**
 * The focus indicator, scored as the two-tone thing it is. Both tones are
 * measured against every surface a focused control can sit on, and the row
 * passes on the better of the two — see bestOfPair. The ribbon is included as a
 * SWEEP rather than a colour, because it is one element that runs from a deep
 * rust to a light gold and the indicator has to survive all of it; that sweep is
 * exactly where a single-colour ring measured 1.25:1 before 1.4.0.
 */
const FOCUS = [
  { role: "Focus indicator (pair)", ring: "--focus-ring", halo: "--focus-ring-halo",
    surfaces: ["--surface-canvas", "--surface-card", "--surface-sunken", "--surface-tint",
               "--action-primary", "--status-bad", "--surface-brand-soft"] },
  // Inside the ribbon, `.e911-ribbon` re-points --focus-ring at --ribbon-text.
  { role: "Focus indicator (ribbon)", ring: "--ribbon-text", halo: "--focus-ring-halo", ribbon: true },
];

/* ------------------------------------------------------------------- run */

function sizeLabel(p) {
  if (p.kind === "ui") return "UI element";
  if (p.kind === "disabled") return "disabled";
  if (p.kind === "logotype") return "logotype";
  return `${p.px}px / ${p.weight}`;
}

const rows = [];
let failures = 0;
let waivedSeen = 0;
const staleWaivers = new Set(Object.keys(WAIVED));

function record(row) {
  const waiver = WAIVED[row.role];
  if (row.pass === false && waiver) {
    row.result = "WAIVED";
    row.note = waiver;
    waivedSeen++;
    staleWaivers.delete(row.role);
  } else if (row.pass === false) {
    row.result = "FAIL";
    failures++;
  } else if (row.pass === null) {
    row.result = "exempt";
  } else {
    row.result = "PASS";
    if (waiver) staleWaivers.delete(row.role);
  }
  rows.push(row);
}

for (const theme of ["light", "dark"]) {
  for (const pair of PAIRS) {
    const need = thresholdFor(pair);
    const fgRaw = pair.fg.startsWith("--") ? resolveToken(pair.fg, theme) : pair.fg;
    for (const bgName of pair.bg) {
      const bgRaw = bgName.startsWith("--") ? resolveToken(bgName, theme) : bgName;
      // A translucent surface (dark's --surface-brand-soft, the soft status
      // fills) is painted over the card, so composite before measuring.
      const canvas = parseColor(resolveToken("--surface-card", theme));
      const bg = over(parseColor(bgRaw), canvas);
      const fg = over(parseColor(fgRaw), bg);
      const ratio = contrast(fg, bg);
      const pass = need === 0 ? null : ratio + 1e-9 >= need;
      record({
        theme,
        role: pair.role,
        fgName: pair.fg,
        bgName,
        fg: hex(fg),
        bg: hex(bg),
        size: sizeLabel(pair),
        need,
        ratio,
        pass,
      });
    }
  }

  const stops = gradientStops(resolveToken("--ribbon-gradient", theme));
  const fgRaw = resolveToken("--ribbon-text", theme);
  for (const item of RIBBON) {
    const need = thresholdFor(item);
    const scrims = (item.scrims ?? []).map((s) => resolveToken(s, theme));
    const { ratio, at, bg } = worstOverZone(stops, fgRaw, scrims, item.zone[0], item.zone[1]);
    record({
      theme,
      role: item.role,
      fgName: "--ribbon-text",
      bgName: `gradient @ ${(at * 100).toFixed(0)}% of run`,
      fg: hex(over(parseColor(fgRaw), bg)),
      bg: hex(bg),
      size: sizeLabel(item),
      need,
      ratio,
      pass: ratio + 1e-9 >= need,
    });
  }

  for (const item of FOCUS) {
    const ringRaw = resolveToken(item.ring, theme);
    const haloRaw = resolveToken(item.halo, theme);

    // The two tones must be legible against each other, whatever they land on.
    const pairRatio = contrast(parseColor(ringRaw), parseColor(haloRaw));
    record({
      theme,
      role: `${item.role} · ring vs halo`,
      fgName: item.ring,
      bgName: item.halo,
      fg: hex(parseColor(ringRaw)),
      bg: hex(parseColor(haloRaw)),
      size: "UI element",
      need: 3,
      ratio: pairRatio,
      pass: pairRatio + 1e-9 >= 3,
    });

    if (item.ribbon) {
      // Worst point anywhere on the run, judged on the better tone there.
      let worst = Infinity;
      let at = 0;
      for (let t = 0; t <= 1 + 1e-9; t += 0.01) {
        const bg = groundAt(stops, [], t);
        const best = bestOfPair(ringRaw, haloRaw, bg);
        if (best < worst) {
          worst = best;
          at = t;
        }
      }
      const bg = groundAt(stops, [], at);
      record({
        theme,
        role: item.role,
        fgName: `${item.ring} + halo`,
        bgName: `gradient @ ${(at * 100).toFixed(0)}% of run`,
        fg: hex(parseColor(ringRaw)),
        bg: hex(bg),
        size: "UI element",
        need: 3,
        ratio: worst,
        pass: worst + 1e-9 >= 3,
      });
      continue;
    }

    for (const surfName of item.surfaces) {
      const canvas = parseColor(resolveToken("--surface-card", theme));
      const bg = over(parseColor(resolveToken(surfName, theme)), canvas);
      const best = bestOfPair(ringRaw, haloRaw, bg);
      record({
        theme,
        role: item.role,
        fgName: `${item.ring} + halo`,
        bgName: surfName,
        fg: hex(parseColor(ringRaw)),
        bg: hex(bg),
        size: "UI element",
        need: 3,
        ratio: best,
        pass: best + 1e-9 >= 3,
      });
    }
  }
}

/* ---------------------------------------------------------------- report */

const w = (s, n) => String(s).padEnd(n).slice(0, n);
const header = [
  w("THEME", 6),
  w("ROLE", 28),
  w("FOREGROUND", 18),
  w("ON", 30),
  w("FG", 8),
  w("BG", 8),
  w("SIZE/WEIGHT", 13),
  w("NEED", 5),
  w("RATIO", 7),
  "RESULT",
].join(" ");

console.log(header);
console.log("-".repeat(header.length));
for (const r of rows) {
  console.log(
    [
      w(r.theme, 6),
      w(r.role, 28),
      w(r.fgName, 18),
      w(r.bgName, 30),
      w(r.fg, 8),
      w(r.bg, 8),
      w(r.size, 13),
      w(r.need === 0 ? "n/a" : `${r.need}:1`, 5),
      w(r.ratio.toFixed(2), 7),
      r.result,
    ].join(" ")
  );
}

console.log("-".repeat(header.length));
console.log(
  `${rows.length} pairs measured across both themes — ` +
    `${failures} failing, ${waivedSeen} waived (see WAIVED in this file).`
);

if (waivedSeen > 0) {
  console.log("\nWaived (measured, below threshold, deliberately unchanged):");
  const shown = new Set();
  for (const r of rows) {
    if (r.result !== "WAIVED" || shown.has(r.role)) continue;
    shown.add(r.role);
    console.log(`  · ${r.role} — ${r.note}`);
  }
}

// A waiver for a pair that now passes is worse than no waiver: it hides the next
// regression of that pair behind an entry nobody re-reads.
if (staleWaivers.size > 0) {
  console.error(
    `\nStale waiver(s): ${[...staleWaivers].join(", ")} no longer fail. ` +
      `Delete them from WAIVED.`
  );
  process.exit(1);
}

if (failures > 0) {
  console.error(
    "\nWCAG 2.1 AA floor breached. Fix the VALUE in tokens/tokens.css — the v3\n" +
      "preset and tokens/tailwind-v4.css are mappings and must define nothing."
  );
  process.exit(1);
}
console.log("\nWCAG 2.1 AA floor holds in both themes.");
