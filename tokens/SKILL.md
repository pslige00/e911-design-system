---
name: e911-design-system
description: E911's locked design system ("Terrazzo × Solstice" direction, "Grotesk Standard" type). Use whenever building or modifying UI for any E911 app — pages, components, dashboards, forms, tables. Enforces semantic tokens, the approved layout patterns, and WCAG AA. Never invent colors, radii, or fonts; consume the tokens.
---

# E911 Design System

Locked 2026-08-14 after five exploration rounds. Do not restyle; consume.

## Non-negotiables

1. **Semantic tokens only.** App code references Tier 2 names (`var(--surface-card)`,
   `text-ink`, `bg-action`) — never hex values, never Tier 1 primitives, never
   hard-coded px radii or font names. If a needed token doesn't exist, add it to
   `tokens.css` in the design-system repo and open a PR there; don't inline a value.
2. **Fonts:** Space Grotesk (display: headings + KPI numerals, weight 700,
   tracking -0.015em) · Onest (all body/UI) · JetBrains Mono (dates, IDs,
   deltas, cert codes — always with `tabular-nums`). Load from Google Fonts or
   the self-hosted copies in `tokens/fonts/`.
3. **Orange discipline.** `#E8690A` (--e911-brand) appears ONLY in the seal and
   the ribbon gradient. Fills use `--action-primary` (#C74F00). Orange text uses
   `--text-brand` (#A83B00). Orange is never a warning color.
4. **Status is pill + dot + word.** Never color alone. Use `ok / warn / bad`
   token pairs (`--status-warn` on `--status-warn-soft`).
5. **A `title=` is not a tooltip.** It never appears on touch, never on focus,
   cannot be styled, and gets announced on top of the `aria-label` it usually
   duplicates. Until 1.3.0 this file promised "tooltips on hover" and the rail
   delivered a `title` — the rail now reveals a real label instead. Where an
   icon-only control genuinely needs one, use the `Tooltip` component: it opens
   on hover AND on `:focus-visible`, keeps its content in the a11y tree as a
   permanently-mounted `role="tooltip"`, and closes on Escape.
6. **AA floor.** ALL text ≥ 4.5:1 on its surface — not just body text. Weight
   and uppercase styling buy nothing: the 3:1 allowance starts at 24px, or
   18.66px if bold, and no component in this system is anywhere near that. This
   rule used to read "anything smaller than 12px must be ≥ semibold and
   uppercase-label styled", which is what let `--text-tertiary` ship at 3.21:1
   under every table header in TimeSweep until 1.2.0. Non-text UI that conveys
   state (focus ring, active underline, domain edge) needs 3:1. Focus states use
   `--focus-ring`, 2px, offset 2. `npm run audit:contrast` checks every pair in
   both themes; run it after touching a colour.
7. **Dark mode is free — keep it free.** Never branch on theme in app code;
   `[data-theme="dark"]` swaps the same semantic names.
8. **Import `DOMAIN_EDGE` and `cn` from the package root, never from a component
   module.** Every component is `"use client"`; a value re-exported through a
   client module reaches a React Server Component as a client-reference proxy,
   so `DOMAIN_EDGE.operations` is not `"orange"`. `DomainCard` then matches no
   hue and renders a 4px top edge in the default border colour — **no error, no
   warning, just the wrong card.** The root export points at `contract.ts`,
   which has no `"use client"`, and is safe from either side.

## The layout pattern ("Terrazzo × Solstice")

- **Shell:** the icon rail on the left, from `AppShell`. Never hand-build one,
  never restyle one. It is `--rail-width` (64px) and icon-only until someone
  asks for the labels, and there are exactly three ways to ask:
  - **hover**, after a ~180ms intent delay, which **overlays** the page. A rail
    that takes width on hover makes every screen jump when a pointer crosses it
    on the way somewhere else — on a wall tablet that is worse than unlabelled
    icons. The grid track follows `pinned`, never `hovered`.
  - **keyboard focus** (`:focus-visible` only), immediately and with no delay.
    One Tab into the page opens the rail with every destination legible.
  - **the pin** — an `aria-pressed` toggle button at the top of the rail. It is
    the only one of the three that exists on a touchscreen, and the only one
    that takes real layout width (`--rail-width-expanded`, 224px). That is what
    pinning means: hover is a peek, a pin is a decision.

  Every row is `--tap-target` (44px) tall, because this runs on wall tablets;
  the icon keeps a 44px box of its own so expanding reveals labels without
  sliding the icons. Active item gets `--surface-brand-soft` + `--text-brand`.
  The rail overlays at `--layer-rail`, below popovers and dialogs. No full
  sidebar, and never a second nav.

  **Persisting the pin is the app's job.** Pass `railPinned` +
  `onRailPinnedChange` and store it under `RAIL_PINNED_STORAGE_KEY` (one key
  across every E911 app — a dispatcher who pins the rail has expressed a
  preference about rails, not about one app). `AppShell` deliberately never
  touches storage: it server-renders, and a component that reads `localStorage`
  during render is a hydration mismatch. With no wiring at all it works
  uncontrolled and starts unpinned.

  Extra destinations go in `footerItems`; non-destination controls (theme,
  avatar) go in `railFooter` as `<RailAction>`. Copying the rail item's class
  string into the footer by hand is how the footer ends up a version behind the
  rail — which is exactly what happened before both of those existed.

```jsx
<AppShell
  items={NAV} activeId={activeId}
  footerItems={[ADMIN]}
  renderLink={({ href, ...props }) => <Link href={href} {...props} />}
  railPinned={pinned}
  onRailPinnedChange={(next) => { setPinned(next); persist(next); }}
  railFooter={<RailAction icon={<Moon size={16} />} label="Dark mode"
                          active={dark} aria-pressed={dark} onClick={toggle} />}
>
```
- **Canvas:** `--surface-dotgrid` over `--surface-canvas` (the dot-grid texture
  is a system signature — keep it).
- **Page header:** the **ribbon** — `--ribbon-gradient`, `--ribbon-text`,
  radius `--e911-radius-lg`, eyebrow (11px caps) + display headline + one-line
  sub. Primary page actions live inside the ribbon, right-aligned
  (white button = primary, ghost = secondary).
- **Cards:** `--surface-card`, border `--border-default`, radius
  `--e911-radius-md`, shadow `--shadow-card`, and a **4px colored top edge**
  keyed to domain: orange=operations, teal=roster/people, gold=certifications,
  green=QA, plum=training, blue=facilities/IT. One domain, one hue, everywhere.
- **Filters:** chip row — 28px, 1.5px border, radius `--e911-radius-sm`;
  active chip = brand-soft fill + `--text-brand`.
- **Tables:** 40px rows, `--surface-sunken` header with 11px caps labels,
  row borders `--border-row`, mono for dates/IDs, cert codes as bordered
  mono chips.
- **KPI cards:** label (11px caps, `--text-tertiary`) → display numeral
  (`--font-size-kpi`, tabular) → sub-line with mono delta pill.

## Component recipes (Tailwind, using the preset)

```jsx
// Primary button
<button className="h-ctl px-3.5 rounded-sm bg-action text-action-fg
  font-semibold text-body hover:bg-action-hover transition duration-fast">

// Domain card (certifications)
<section className="bg-card border border-line border-t-edge border-t-edge-gold
  rounded shadow-card p-4">

// Status pill
<span className="inline-flex items-center gap-1.5 h-[21px] px-2 rounded-pill
  text-[11px] font-semibold bg-warn-soft text-warn">
  <i className="size-[5px] rounded-pill bg-current" />Due soon</span>

// KPI numeral
<b className="font-display text-kpi tabular-nums">94.6%</b>
```

## Anti-patterns (reject in review)

- Hex colors, `#000`/pure black, or gray-scale neutrals (all neutrals are warm)
- Orange as a button when the message is a warning, or amber styled like a button
- A hand-built sidebar or nav of any kind. The rail is `AppShell`'s, labels and
  all — a local one that "just adds labels" is a second nav that will not learn
  about the pin, the tap targets, or the overlay rule
- More than one ribbon per page; shadows deeper than `--shadow-pop`; radii other
  than the three tokens; new fonts of any kind
- Status conveyed by color only; non-tabular digits in any numeric column
- `title="…"` used as a tooltip (rule 5), or an interactive target under
  `--tap-target` anywhere a finger can reach it

## Source of truth

The `e911-design-system` repo (`@e911/design-system` package) — `tokens/tokens.css`
(canonical), `tokens/tailwind.preset.js`, `tokens/tokens.json`,
`tokens/tokens.scss` (build-time math only), `src/` (React components).
`tokens/spec.html` renders every token and pattern for visual review.
This is a **separate repo from every app** — see the app repo's `SETUP.md`
or its own `.claude/skills/` copy of this file for how it's wired in.
