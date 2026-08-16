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
   state (active underline, domain edge) needs 3:1 — and so does the boundary of
   a form control, which is what `--border-control` is for: it closed the
   system's last 1.4.11 waiver in 1.5.0, taking an input's stroke from 1.31:1 to
   3.38:1 in light and 1.89:1 to 3.27:1 in dark. `npm run audit:contrast` checks
   every pair in both themes; run it after touching a colour.

   **Why the card border is 1.21:1 in light and was lifted to 2.04:1 in dark.**
   Every sweep re-raises this, so here is the measurement that settles it. The
   stated reason for lifting dark in 1.4.0 was that `--surface-card` is only
   ~1.09:1 against `--surface-canvas` there, so the BORDER is what says "card",
   not the surface — and the objection is that light measures 1.08:1, which
   looks like the same situation. It is not, and the contrast RATIO is what
   hides that. Painted pixels, Chrome, measured for 1.6.0:

   | | ratio | luminance step |
   |---|---|---|
   | light card ↔ canvas | 1.08:1 | **0.0766** |
   | dark card ↔ canvas | 1.08:1 | **0.0043** |
   | light card border ↔ canvas | 1.21:1 | **0.1712** |
   | dark card border ↔ canvas | 2.04:1 | **0.0578** |

   Identical ratios, an 18× difference in the actual luminance step — because
   the ratio's `+0.05` flare term dominates at the dark end, where every value
   in the theme sits below L=0.06. In light the card genuinely IS identified by
   its own surface and the border is trim; in dark the surface difference is
   nothing and the border was carrying the whole job at a third of the physical
   edge strength. Lifting dark restored the light-mode edge; lifting light as
   well would darken trim that is already the strongest edge on the page. **The
   asymmetry is deliberate. Both stay waived** in `scripts/contrast-audit.mjs`
   as separation rather than identification. Across themes, compare the
   luminance step, not the ratio — and neither figure is a reason to touch
   `--border-control`, which is a different tier doing a regulated job.
7. **Never draw your own focus ring.** One rule in `tokens.css` gives every
   focusable thing in every app a TWO-TONE indicator — `--focus-ring` with
   `--focus-ring-halo` either side of it — because no single colour clears 3:1
   on every surface the system paints: a single-colour ring measured 1.25:1 on
   the ribbon gradient in both themes. Two consequences for app code:
   - a local `focus:ring-*`, `focus:outline-*` or `focus-visible:` colour is a
     review block. If a control needs a different ring, re-point `--focus-ring`
     on the SURFACE (what `.e911-ribbon` does), never on the control.
   - do not add `outline-color` or `box-shadow` to a transition. Tailwind's
     `transition` utility already lists both, and the system's focus rule sets
     `transition-property: none` for exactly that reason: an indicator that
     animates in spends its first frame at `currentColor`, which on a primary
     button is the label colour on the button's own surface — white on white.
8. **Dark mode is free — keep it free.** Never branch on theme in app code;
   `[data-theme="dark"]` swaps the same semantic names.
9. **A control never discards what an operator typed.** A rule since 1.5.0,
   because `DateField` broke it and it cost a wage record: an out-of-range typed
   date was treated as undoable — the draft reverted, no `onChange` fired, and a
   leave form with `min={startDate}` filed twelve hours against a day the
   employee never entered while the screen still said "1 day". A component
   cannot know an app's error copy, so it must never be the thing that decides
   an entry did not happen. `DateField` now KEEPS the text, emits the value
   whenever it is a real date, reports `onReject({ text, value, reason, limit })`
   either way, and marks itself `aria-invalid` until the operator edits it. The
   app's validation gets to speak, in the app's words, via `FormField`'s
   `error`. If you build a control that can refuse input, refuse it out loud.
10. **A modal owns focus, including when focus is already outside it.** A rule
   since 1.6.0, because `Dialog` broke it and `aria-modal="true"` made the break
   worse than useless. The trap was one `onKeyDown` on the dialog's own wrapper,
   which assumes focus is inside the panel when Tab is pressed. Two ways that
   fails, both found in a consumer:
   - the forward branch wrapped `last → first` but had no
     `!panel.contains(active)` arm, so focus already outside came back on
     Shift+Tab and walked further away on Tab;
   - a keydown handler only fires for keys pressed inside it. Focus on `<body>`
     reaches nothing, so the trap is simply ABSENT — three Tabs walked into the
     page behind the dialog, whose controls a screen reader will not describe
     because `aria-modal` told it that region does not exist.

   Focus reaches `<body>` on ordinary screens, not exotic ones: **a footer
   button carrying `disabled={pending}` disables itself under the operator's
   finger, and a disabled element cannot hold focus.** No `focusin` follows, so
   a recapture keyed only on `focusin` does not fire either — `focusout` with a
   null `relatedTarget` is the event that exists, and `document.activeElement`
   is not updated until the change finishes. `Dialog` now recaptures from a
   document-level listener, only for the TOP panel in a stack, and never onto an
   element that has just become unfocusable. If you build another layer that
   claims modality, it owns focus by the same rules; `aria-modal` without a trap
   that works from outside is a promise to assistive technology you are not
   keeping.
11. **Import `DOMAIN_EDGE` and `cn` from the package root, never from a component
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

  `AppShell` also renders the **skip link** (WCAG 2.4.1) as the first thing in
  the DOM, pointing at the `<main>` it owns — `mainId` names the target,
  `skipLink={false}` opts out for an app that renders its own before the shell.
  Do not hand-build one: the rail's pin is deliberately the first control INSIDE
  the rail, so only the shell can put a bypass ahead of it. `<SkipLink>` is
  exported for pages with no shell at all (sign-in, kiosk).

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

  **Everything right-aligned goes in `actions`, including plain text.** That
  slot carries `--ribbon-actions-scrim`, and it exists because the gradient's
  gold end is 2.4:1 against `--ribbon-text`: measured across 1024/1440/1920px,
  ribbon text holds 4.5:1 only to about 55% of the width. A freshness stamp or a
  record count dropped anywhere else on the ribbon fails AA at most window
  sizes. Size it with `text-ribbon-meta` — the same step `RibbonButton` uses, so
  app code never writes `text-[12.5px]` to line up with it.
- **Cards:** `--surface-card`, border `--border-default`, radius
  `--e911-radius-md`, shadow `--shadow-card`, and a **4px colored top edge**
  keyed to domain: orange=operations, teal=roster/people, gold=certifications,
  green=QA, plum=training, blue=facilities/IT. One domain, one hue, everywhere.

  `DomainCard` names its own `<section>` from its title, so every titled card is
  a landmark — and takes `titleLevel` (default 3) so the page's heading outline
  is the app's decision, not the component's. The ribbon renders the `h1`, so a
  card directly under it is usually `titleLevel={2}`. Do NOT bridge the gap with
  an `sr-only` heading of your own; that was the workaround this prop replaced.
  A `KpiCard` is deliberately unnamed — six landmarks called "Coverage" between
  the header and the first table is rotor noise, not navigation.
- **Filters:** chip row — 28px, 1.5px border, radius `--e911-radius-sm`;
  active chip = brand-soft fill + `--text-brand`.
- **Controls:** `--control-height` (32px) is the system's density and the
  default for `Button`, `Chip` (28px), `Select`, `DateField` and whatever
  `FormField` wraps. Their boundary is `--border-control`, a tier of its own at
  ≥3:1 — an input is `bg-card` inside a card that is also `bg-card`, so the
  stroke is the only thing identifying the field (1.4.11). Dividers and row
  rules stay on `--border-default`; do not swap one for the other.

  **A screen a finger uses takes `size="tap"`,** which paints the control at
  `--tap-target`. One prop across the whole family, so a kiosk form is coherent
  instead of one raised control beside four default ones:

  ```jsx
  <FormField id="end" label="Last day off" size="tap">
    {(props) => <DateField id={props.id} size="tap" value={end} onChange={setEnd} />}
  </FormField>
  <Button size="tap">Record</Button>
  ```

  **Boolean controls: `Checkbox` and `Radio`** (1.6.0). Both are a real
  `<input>` with `appearance: none`, so they stay a checkbox to a form, to
  `:checked`, and to a screen reader while the system paints the box. Three
  things about them are different from every other control here, and all three
  are deliberate:

  - **The label is a CHILD, not a prop, and it is part of the control.**
    `<Checkbox>…</Checkbox>` wraps the box and the text in one `<label>`: the
    text is the accessible name, clicking anywhere in the row toggles the box,
    and rich content (a mono span, an interpolated name) works because it is
    just children. **Do not put one inside `FormField`.** That renders a label
    ABOVE a control with a value; a checkbox's label sits after the box and has
    to be inside the hit area, so the two are different patterns rather than
    competing ones. For a SET with one shared label and one error, write the
    `<fieldset><legend>` (or `role="radiogroup"` + `aria-label`) yourself and
    point `aria-describedby` at your own message — the grouping element is where
    an app's layout and error copy live.
  - **The hit area is bigger than the painted box, on purpose.** The label row
    is `--tap-target` (44px) at BOTH sizes; `size` moves the box only —
    `--check-size` (18px) or `--check-size-tap` (24px). A 44px checkbox is a
    tile, and a finger presses the row.
  - **`indeterminate` is a prop and is announced as "mixed", never as checked.**
    It is a DOM property with no HTML attribute, which is why the component sets
    it rather than letting you spell it in JSX, and why `checked` still governs
    what submits.

  `Radio` requires `name` — that is what makes a set one control with one tab
  stop and arrow-key selection. A hand-rolled `<input type="checkbox">` with
  `accent-color` is a review block: it passes a token check while leaving size,
  radius, disabled treatment and the focus ring to the browser, so it is a
  different control in Chrome and in Firefox and gets the UA ring instead of the
  system's two-tone one.

  Two things NOT to do instead, both tried first by consumers: raising
  `--control-height` (it resizes every control in every E911 app to serve one
  screen), and `className="h-tap"` (it works on a bare `<input>` and silently
  does not on any component whose className lands on a wrapper — `DateField`
  drew a 44px box around a 32px input and nothing said so). `FormField` does not
  forward `size` into its child props: `size` on an `<input>` is a real HTML
  attribute meaning width in characters, and `{...props}` would set it. Pass it
  to both.
- **Tables:** 40px rows, `--surface-sunken` header with 11px caps labels,
  row borders `--border-row`, mono for dates/IDs, cert codes as bordered
  mono chips.

  **A row that navigates uses `rowHref` + `renderLink`, never `onRowClick`
  alone.** `onRowClick` is a `<tr onClick>` — mouse-only, no tab stop, nothing
  in the a11y tree, and a 2.1.1 failure. `rowHref` puts one real link in the
  first cell (named after the row's subject) and keeps the whole row clickable
  for a pointer. Rows that go nowhere — totals, subheads — opt out with
  `rowClickable`, so a summary row stops claiming a cursor it cannot honour.

  **Name the link by what it is FOR, with `rowLinkPurpose`** (1.5.0). Twenty-four
  rows called "Never punched out" are twenty-four identical links in a rotor;
  the purpose says which one goes where (2.4.4). It is a SUFFIX, not a label:
  the component renders it visually-hidden AFTER the visible text, so the
  accessible name begins with what the row says and WCAG 2.5.3 cannot be
  violated by anything the callback returns. There is deliberately no
  `rowLinkLabel` free-form prop — "Show 87" over a row reading "Never punched
  out" would break speech control and nothing would catch it.

  **Scope the link with `ctx.rowLink` when the first cell holds more than the
  subject** (1.5.0). The anchor otherwise wraps the whole cell and the name
  absorbs everything in it — a `StatusTag`'s severity word, a `CertChip`'s badge
  number — which is informative by luck at best:

  ```jsx
  cell: (row, { rowLink }) => (
    <span className="flex items-center gap-2">
      {rowLink(<span className="font-medium">{row.name}</span>)}
      <CertChip>{row.badge}</CertChip>
      <StatusTag tone={row.tone}>{row.severity}</StatusTag>
    </span>
  )
  // link name: "Huskey, Christopher — show these 36 in the queue"
  // not:       "Huskey, Christopher KC-1119 Blocking"
  ```

  Not calling it keeps the pre-1.5.0 behaviour exactly. Call it once per row —
  twice is two tab stops for one destination, and the component says so on the
  console.
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
  than the four tokens — `--e911-radius-sm` / `-md` / `-lg` plus the pill, and
  `--e911-radius-xs` (5px, added 1.6.0), which belongs to the `Checkbox` box and
  nothing else: 8px on an 18px square reads as a circle and collides with
  `Radio`. Reaching for `xs` on a chip, an input or a card is the block; new
  fonts of any kind
- Status conveyed by color only; non-tabular digits in any numeric column
- A form control drawn on `--border-default` (that tier separates; controls are
  identified by `--border-control`, which is the one held to 3:1)
- A control raised to finger size with a height utility instead of `size="tap"`,
  or `--control-height` changed to serve one screen
- `title="…"` used as a tooltip (rule 5), or an interactive target under
  `--tap-target` anywhere a finger can reach it
- A local focus ring of any kind (rule 7), or `outline-color` in a transition
- A hand-rolled checkbox or radio — a bare `<input type="checkbox">`, with or
  without `accent-color`, or a `<span>` drawn to look like one. Use `Checkbox` /
  `Radio`; a checkbox inside `FormField`, or one whose row is under
  `--tap-target`, is the same block
- A modal layer that traps focus only from a handler bound inside itself
  (rule 10) — it stops working in the one state that matters
- A clickable table row with no `rowHref`, or a card whose heading level was
  chosen by the component rather than by the page

## Source of truth

The `e911-design-system` repo (`@e911/design-system` package) — `tokens/tokens.css`
(canonical), `tokens/tailwind.preset.js`, `tokens/tokens.json`,
`tokens/tokens.scss` (build-time math only), `src/` (React components).
`tokens/spec.html` renders every token and pattern for visual review.
This is a **separate repo from every app** — see the app repo's `SETUP.md`
or its own `.claude/skills/` copy of this file for how it's wired in.
