# e911-design-system

The design system for E911's internal apps. **Not an app itself** — every
app lives in its own repo and depends on this one. See `SETUP.md` for how
to consume it.

**Direction:** Terrazzo × Solstice · **Type:** Grotesk Standard
(Space Grotesk / Onest / JetBrains Mono) · **v1.3.0** · Locked 2026-08-14.

| Path | What it is |
|---|---|
| `tokens/tokens.css` | **Canonical source of truth.** Tier 1 primitives + Tier 2 semantic tokens, light default + dark set. |
| `tokens/tailwind.preset.js` | Tailwind **v3** preset mapping utilities → the CSS variables. |
| `tokens/tailwind-v4.css` | Tailwind **v4** port producing the same utility names. Both are maintained; neither is deprecated. Add any new utility to **both**. |
| `tokens/tokens.json` | Machine-readable export (Style Dictionary shape). |
| `tokens/tokens.scss` | Primitives as SCSS vars — build-time math only. |
| `tokens/spec.html` | Living spec. `<link>`s the real `tokens.css` rather than inlining a copy — keep it that way, or it becomes a second source of truth. Open directly in a browser; no build step. |
| `tokens/SKILL.md` | Claude Code skill — copy into every consuming app repo. |
| `src/` | React component library. Shell + data: `AppShell`, `RailAction`, `Ribbon`, `DomainCard`, `KpiCard`, `DataTable`, `StatusTag`, `CertChip`, `Chip`, `Button`, `FormField`. Interaction primitives: `Dialog`/`DangerDialog`, `Select`, `Tabs`/`TabPanel`, `ToastProvider`/`useToast`, `DateField`, `Pagination`, `Tooltip`. |
| `src/contract.ts` | The DATA half — `DOMAIN_EDGE`, `cn`, `RAIL_PINNED_STORAGE_KEY`. No `"use client"`, so a React Server Component can read the real values. |
| `SETUP.md` | **Start here** — how a separate app repo installs and wires this up. |

## The five rules (short form)

1. Semantic tokens only — no hex, no raw px radii, no font names in app code.
2. `#E8690A` = seal + ribbon gradient only. Fills `--action-primary`, text `--text-brand`.
3. Status = pill + dot + word. Never color alone.
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
