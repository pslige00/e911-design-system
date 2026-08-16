# e911-design-system

The design system for E911's internal apps. **Not an app itself** — every
app lives in its own repo and depends on this one. See `SETUP.md` for how
to consume it.

**Direction:** Terrazzo × Solstice · **Type:** Grotesk Standard
(Space Grotesk / Onest / JetBrains Mono) · **v1.7.0** · Locked 2026-08-14.

**New in 1.7.0**, all additive — not one existing token value moved, so every
screen built against 1.6.0 renders identically:

- **Five status tones, not three.** `Tone` gains `info` and `neutral`
  (`--status-info` / `-soft`, `--status-neutral` / `-soft`). The three-tone
  constraint was deliberate and had a good argument behind it; the census that
  overturned it is recorded in SKILL.md rule 4 and in `tokens.css`, so it is not
  re-argued from taste. In the first consuming app, **`warn` was used 84 times
  across ~60 distinct labels and only about 17 were cautionary** — the rest were
  neutral classification ("Note", "Net", "Eligible") and plain absence ("No
  timesheet", "Not configured"). Gold meant "needs attention" and "pay is not in
  question" on the same screen. The two new tones give the amber back its
  meaning; they do not let a status avoid having one. **`neutral` has a written
  rule** and it is short: a state that is real, known, and carries no
  judgement — and if the label reads the same with no pill at all, the answer is
  no pill, not a neutral one.
- **Disabled and selected are tokens now** — `--surface-disabled`,
  `--text-disabled`, `--border-disabled`, `--surface-selected`,
  `--border-selected`. `Button`, `Select` and `DateField` had each invented
  their own, which is the drift that produced the 2.01:1 ribbon label. 1.4.3
  exempts disabled text from the contrast floor; that is permission to be quiet,
  not to be unreadable, so `--text-disabled` measures 2.90:1 light / 3.23:1 dark
  **on `--surface-disabled`** — the unflattering figure, quoted deliberately,
  because it is where a disabled `Button`'s label actually sits. And
  `--surface-selected` is emphasis only at 1.31:1: `--border-selected` carries
  1.4.11, and every consumer still owes `aria-selected` or `aria-current`.
- **Six browser surfaces are ours** — `caret-color`, `scrollbar-color`,
  `::selection`, `::placeholder`, `::marker`, link underline offset, all set
  once in `.e911-app` out of tokens that already existed. Chrome's `#3477F5`
  selection band on a palette with no cool hue in it was the one moment the app
  looked like an unstyled form; a browser-default placeholder undid half of what
  `--border-control` bought in 1.5.0, on the same field.
- **Every size the system paints has a name.** Seven type tokens —
  `--font-size-micro` 10.5 · `-badge` 10 · `-meta` 11.5 · `-ui-sm` 12 ·
  `-control` 13 · `-ribbon-h1` 24 · `-seal` 9 — replacing 27 `text-[Npx]`
  literals inside this package's own components. **No rendered pixel changed.**
  Naming and resizing are separate passes on purpose.
- **`--e911-dur-slow` (240ms)** for movement that changes size or position — the
  rail opening, a dialog entering. 170ms was carrying both that and a colour
  swap, and a 160px layout shift at 170ms reads as clipped.
- **`EmptyState` and `Skeleton`,** plus `loading` / `loadingRows` on `DataTable`
  and a default for `empty`. A table still fetching and a table with nothing in
  it were the same rendering, so an operator on a slow link read "No exceptions"
  off a queue that had forty. Both components live in `src/feedback.tsx`, the
  only module besides `contract.ts` with no `"use client"` — a server page can
  render an empty state without a client wrapper beside it.
- **`DataTable` owns its horizontal overflow**, as a named, focusable region.
  Without it a wide table was not awkward but *clipped and gone*: `DomainCard`
  is `overflow-hidden` and the header cells are `whitespace-nowrap`, so on a
  1024px wall tablet the right-hand columns of a timecard were unreachable with
  no scrollbar and no cut edge to say so. Six screens in the first consuming app
  had each wrapped the component in an overflow div of their own. Pass
  `aria-label` — it names the table and the region both.
- **A documentation correction.** SKILL.md called the ribbon eyebrow and the
  `DataTable` column header "11px caps" from 1.0.0 to 1.7.0. They are 10.5px and
  always were — `scripts/contrast-audit.mjs` has scored both at `px: 10.5` the
  whole time, so the instrument was right while the prose was wrong. Fixed, and
  noted where it was wrong.
- **The ribbon's eyebrow is recorded as a deliberate exception** (SKILL.md, page
  header), after an external review flagged it against the general rule that a
  kicker above a heading is decoration. The shell's nav is a 64px icon rail with
  no breadcrumb, so the eyebrow is the only thing naming which of the six
  domains the operator is in — wayfinding, not ornament, on the condition that
  it carries what the collapsed rail cannot.

**In 1.6.0:** `Checkbox` and `Radio` — real `<input>`s with `appearance: none`,
so `:checked`, form submission and the accessible role stay the browser's while
the box is the system's; the label is a CHILD and part of the 44px hit area, and
the painted box is `--check-size` (18px) / `--check-size-tap` (24px). `Dialog`
now traps focus that is already outside it — a footer button carrying
`disabled={pending}` drops focus on `<body>`, where a wrapper-bound keydown
handler never fires. And the light/dark card-border asymmetry is written down
(SKILL.md rule 6) with the luminance-step measurements behind it.

**In 1.5.0:**
a `DataTable` row link can say what it is FOR (`rowLinkPurpose`) and can be
scoped to the row's subject rather than swallowing the whole first cell
(`ctx.rowLink`, the second argument to a `cell`); `DateField` no longer discards
a typed date it refuses (`onReject`, and a real date reaches `onChange`
regardless); every control in the family takes `size="tap"` for wall tablets;
and `--border-control` closes the system's last WCAG 1.4.11 waiver — a form
control's boundary measures 3.38:1 light / 3.27:1 dark, up from 1.31:1 / 1.89:1.

| Path | What it is |
|---|---|
| `tokens/tokens.css` | **Canonical source of truth.** Tier 1 primitives + Tier 2 semantic tokens, light default + dark set. |
| `tokens/tailwind.preset.js` | Tailwind **v3** preset mapping utilities → the CSS variables. |
| `tokens/tailwind-v4.css` | Tailwind **v4** port producing the same utility names. Both are maintained; neither is deprecated. Add any new utility to **both**. |
| `tokens/tokens.json` | Machine-readable export (Style Dictionary shape). |
| `tokens/tokens.scss` | Primitives as SCSS vars — build-time math only. |
| `tokens/spec.html` | Living spec. `<link>`s the real `tokens.css` rather than inlining a copy — keep it that way, or it becomes a second source of truth. Open directly in a browser; no build step. |
| `tokens/SKILL.md` | Claude Code skill — copy into every consuming app repo. |
| `src/` | React component library. Shell + data: `AppShell`, `RailAction`, `SkipLink`, `Ribbon`, `DomainCard`, `KpiCard`, `DataTable`, `StatusTag`, `CertChip`, `Chip`, `Button`, `FormField`. Boolean controls: `Checkbox`, `Radio`. States: `EmptyState`, `Skeleton`. Interaction primitives: `Dialog`/`DangerDialog`, `Select`, `Tabs`/`TabPanel`, `ToastProvider`/`useToast`, `DateField`, `Pagination`, `Tooltip`. |
| `src/contract.ts` | The DATA half — `Tone`, `DOMAIN_EDGE`, `cn`, `RAIL_PINNED_STORAGE_KEY`. No `"use client"`, so a React Server Component can read the real values. |
| `src/feedback.tsx` | `EmptyState`, `Skeleton`. Also no `"use client"` — neither holds state, takes a handler, or touches the DOM, so a server page renders them directly. |
| `SETUP.md` | **Start here** — how a separate app repo installs and wires this up. |

## The five rules (short form)

1. Semantic tokens only — no hex, no raw px radii, no raw px type sizes, no font
   names in app code. Since 1.7.0 that includes this package's own components.
2. `#E8690A` = seal + ribbon gradient only. Fills `--action-primary`, text `--text-brand`.
3. Status = pill + dot + word. Never color alone. Five tones — and a `neutral`
   pill on a label that reads the same without one is no pill, not a quiet one.
   3b. Focus is one rule in `tokens.css` — a two-tone ring, never a local one.
   3c. So are disabled, selected, and the six browser surfaces: one place each.
4. Digits are tabular, dates/IDs are mono.
5. Domain edge colors: orange ops · teal roster · gold certs · green QA · plum training · blue facilities.

## Working on this repo

```bash
npm install
npm test              # typecheck + the contrast audit — the AA floor is a build gate
npm run typecheck     # checks src/ against tsconfig.json
npm run audit:contrast  # every text/surface pair, both themes, read from tokens.css
```

Open `tokens/spec.html` directly in a browser to review token changes —
it has the whole system inlined, no dev server needed.

Full change → consume → update workflow is in `SETUP.md`.
