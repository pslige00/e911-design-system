---
name: e911-design-system
description: E911's locked design system ("Terrazzo × Solstice" direction, "Grotesk Standard" type). Use whenever building or modifying UI for any E911 app — pages, components, dashboards, forms, tables. Enforces semantic tokens, the approved layout patterns, and WCAG AA. Never invent colors, radii, or fonts; consume the tokens.
---

# E911 Design System

Locked 2026-08-14 after five exploration rounds. Do not restyle; consume.

## Non-negotiables

1. **Semantic tokens only.** App code references Tier 2 names (`var(--surface-card)`,
   `text-ink`, `bg-action`) — never hex values, never Tier 1 primitives, never
   hard-coded px radii, px type sizes, or font names. If a needed token doesn't
   exist, add it to `tokens.css` in the design-system repo and open a PR there;
   don't inline a value. **Since 1.7.0 this binds the package too:** it was
   itself writing `text-[Npx]` 27 times across 8 components, at sizes a consumer
   could not name, override, or be linted against.
2. **Fonts:** Space Grotesk (display: headings + KPI numerals, weight 700,
   tracking -0.015em) · Onest (all body/UI) · JetBrains Mono (dates, IDs,
   deltas, cert codes — always with `tabular-nums`). Load from Google Fonts or
   the self-hosted copies in `tokens/fonts/`.
3. **Orange discipline.** `#E8690A` (--e911-brand) appears ONLY in the seal and
   the ribbon gradient. Fills use `--action-primary` (#C74F00). Orange text uses
   `--text-brand` (#A83B00). Orange is never a warning color.
4. **Status is pill + dot + word.** Never color alone. Five tones since 1.7.0 —
   `ok / warn / bad / info / neutral` — each a token pair (`--status-warn` on
   `--status-warn-soft`).

   **When `neutral` is legitimate.** It is for a state that is real, known, and
   carries no judgement: a classification the operator should read but need not
   act on — "Voluntary", "Salaried", "Draft". It is NOT the tone for "I could
   not decide", and it is not a way to avoid choosing one. The test is one
   sentence: **if the label would read exactly the same with no pill at all, the
   answer is no pill, not a neutral one.** A pill is a claim that the state
   matters enough to mark; a neutral pill around a word that was already doing
   its own work is decoration with a border-radius, and it costs a dispatcher a
   glance to discover it says nothing. `info` is the neighbouring case — a fact
   worth reading that carries no action: provenance, "this is a live estimate",
   "recorded by a supervisor".

   **Why the tones widened, so it is not re-argued from taste.** The system
   shipped three on purpose until 1.7.0, and the argument was a good one: *a
   status with no tone is a status the reader has to interpret.* What it missed
   is what happens to the tone that absorbs everything the other two cannot
   classify. Census taken in the first consuming app before the change: `warn`
   was used **84 times across ~60 distinct labels, and about 17 of them were
   cautionary.** The other two-thirds were neutral classification — "Note",
   "Net", "Moves money", "Eligible", "Live estimate" — and plain absence: "No
   timesheet", "Not configured", "No roster for this date". Gold meant "this
   needs attention" and "pay is not in question" on the same screen, in the same
   table. `info` and `neutral` exist to give the amber back its meaning, not to
   let a status avoid having one.

   **And the word got MORE load-bearing, not less.** Relative luminance of the
   five light-theme tones: `info` 0.1104 · `bad` 0.1125 · `ok` 0.1132 ·
   `neutral` 0.1135 · `warn` 0.1280 — a **0.018 spread across the whole set**,
   with three of them stacked inside 0.001 of each other. Every one clears 4.5:1
   on its own fill (5.14–5.58 in light), which is all AA asks — and all AA asks:
   to a dichromat, or to anyone reading a dim wall tablet from across the room,
   five tones are five shades of one grey. Colour was always the secondary
   channel here; doubling the palette doubles the dot's and the word's job. A
   `StatusTag` carrying a tone and no word is a review block at five tones for
   exactly the reason it was at three.
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
12. **Disabled and selected are tokens, not each component's opinion.** New in
   1.7.0, because until then there was no token for either and `Button`,
   `Select` and `DateField` had each picked their own opacity or their own grey.
   Nothing compared them — the same shape of drift that produced the 2.01:1
   ribbon button label, where two halves were free to desync and no single place
   would notice.
   - **Disabled:** `--surface-disabled`, `--text-disabled`, `--border-disabled`.
     WCAG 1.4.3 exempts a disabled control from the contrast floor, and the
     audit records these as `kind:"disabled"` rather than failing on them. That
     exemption is permission to be **quiet, not permission to be unreadable** —
     a dispatcher still has to read WHICH action is unavailable in order to know
     what to do instead. The number to hold in mind is the unflattering one:
     `--text-disabled` is 3.38:1 on `--surface-card`, but **2.90:1 light /
     3.23:1 dark on `--surface-disabled`**, which is where a disabled `Button`'s
     label actually sits. If a later change makes disabled text quieter, 2.90 is
     the figure to argue against. `--border-disabled` is deliberately near
     invisible (1.33–1.55 light, 1.44–1.46 dark): the fill and the label already
     say "unavailable", and a boundary held to 3:1 would make the disabled
     control the highest-contrast object in the form. A local `opacity-50` is a
     review block — it fades label, border and focus ring together, by a factor
     rather than to a measured value, landing wherever the surface puts it.
   - **Selected:** `--surface-selected`, `--border-selected`. Three states that
     look adjacent and are not — `--surface-tint` is a POINTER resting somewhere,
     `--surface-brand-soft` is the active nav DESTINATION (a statement about
     where you are), and this is what the operator CHOSE. `Select`'s option list
     and `DateField`'s calendar used tint for all three, so hovering an
     unselected option made it look chosen. Selected is one step darker than
     tint in light and one step lighter in dark: a choice outranks a pointer, so
     it has to survive being hovered.

     **The fill is not the identifier, and must not become one.**
     `--surface-selected` measures 1.31:1 on card in light and 1.17:1 in dark —
     nowhere near the 3:1 that 1.4.11 asks of a boundary identifying a component
     state, and raising it there would put a mid-grey bar through a table meant
     to be read. `--border-selected` carries the requirement instead: it is
     `--action-primary`, 3.53:1 light and 4.28:1 dark. So every consumer **must
     also carry the state non-visually** — `aria-selected` or `aria-current` —
     and `Select` additionally keeps a check mark, a font-weight and
     `--text-brand`. **Nobody removes that check mark on the grounds that the
     fill now exists.** The fill is the weakest of the four signals, not the
     strongest; it is the same separation-versus-identification line the card
     border is waived under in rule 6.
13. **Six browser surfaces belong to the system now. Do not re-declare them, and
   do not redraw the scrollbar.** `caret-color`, `scrollbar-color`,
   `::selection`, `::placeholder`, `::marker`, and a link's underline offset are
   all set once in `.e911-app` (1.7.0), out of tokens that already existed — the
   block spends no new colour. It is not a cosmetic pass: Chrome's selection
   band is `#3477F5` on a palette that contains no cool hue at all, so a
   dispatcher dragging across a badge number to paste it into the CAD gets a
   cobalt stripe over a warm-neutral table, which is the one moment the app
   looks like an unstyled form. And a placeholder left at the browser's
   `#9AA0A6` undoes half of what `--border-control` bought in 1.5.0, on the same
   field, for the same operator at the same arm's length.
   - A local `::selection`, `caret-color` or `::placeholder` rule in app code is
     a review block, on the same grounds as a local focus ring (rule 7).
   - So is `::-webkit-scrollbar` and its family, *even though it is the more
     powerful API*. The system uses the standard two-value `scrollbar-color`
     deliberately: the webkit pseudo-elements redraw the widget, which throws
     away the platform's overlay behaviour, its touch expansion, and on a wall
     tablet its hit area. Tinting a thumb and a track is theming; redrawing the
     widget is shipping a different control.
   - The base rule sets `::placeholder { opacity: 1 }` and that line is
     load-bearing: Firefox ships the pseudo-element at 0.54, which would take
     `--text-tertiary` from its audited 4.98:1 to roughly 2.6:1 — a tier raised
     in 1.2.0 specifically to clear 4.5:1, silently undone by a UA default in
     one browser.

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
  radius `--e911-radius-lg`, eyebrow (`--font-size-micro`, 10.5px caps) +
  display headline (`--font-size-ribbon-h1`, 24px) + one-line sub
  (`--font-size-ribbon-meta`). Primary page actions live inside the ribbon,
  right-aligned (white button = primary, ghost = secondary).

  **Everything right-aligned goes in `actions`, including plain text.** That
  slot carries `--ribbon-actions-scrim`, and it exists because the gradient's
  gold end is 2.4:1 against `--ribbon-text`: measured across 1024/1440/1920px,
  ribbon text holds 4.5:1 only to about 55% of the width. A freshness stamp or a
  record count dropped anywhere else on the ribbon fails AA at most window
  sizes. Size it with `text-ribbon-meta` — the same step `RibbonButton` uses, so
  app code never writes `text-[12.5px]` to line up with it.

  **Why the ribbon keeps its eyebrow.** An external design review flagged it in
  1.7.0 against a general rule that is usually right — *a kicker above a heading
  is decoration, and a heading that needs one is a heading that has not been
  written yet.* It is being KEPT, and the reasoning is recorded here for the
  same reason the card-border asymmetry above is: so the next sweep reads the
  argument instead of re-running it. **The shell's navigation is a 64px icon
  rail with no breadcrumb, and it is collapsed by default.** The eyebrow is
  therefore the only element on the page that names which of the six E911
  domains the operator is standing in. The heading says "Pay Period 14"; the
  eyebrow says "Approvals". That is wayfinding, and it is the wayfinding the
  general rule assumes a breadcrumb is already providing.

  It is kept **on a condition**, which is what makes this an exception rather
  than an opinion: the eyebrow must carry what the collapsed rail cannot. An
  eyebrow reading "APPROVALS" over a heading reading "Approvals" is the
  decoration the review described, and at that point the general rule is right
  and it should go.
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
- **Tables:** 40px rows, `--surface-sunken` header with `--font-size-micro`
  (10.5px) caps labels, row borders `--border-row`, mono for dates/IDs, cert
  codes as bordered mono chips.

  **`DataTable` owns its own horizontal scroll, and the region is a named tab
  stop** (1.7.0). Without it a wide table was not awkward, it was **clipped and
  gone**: `DomainCard` sets `overflow-hidden` (it has to — a flush table would
  otherwise square off the card's own corners), the table renders wider than the
  card whenever its columns sum past it, and the header cells are
  `whitespace-nowrap` so they cannot shrink to fit. On a 1024px wall tablet the
  right-hand columns of a timecard were unreachable, with no scrollbar and no
  cut edge to say anything was missing. Six screens in the first consuming app
  had each wrapped the component in an `overflow-x` div of their own, which is
  the system being asked for something six times and not answering.

  So: **do not wrap a `DataTable` in your own `overflow-x-auto`** — that nests a
  second scroller, and the outer one, which is the one the pointer actually
  hits, is the unnamed unfocusable kind. **Pass `aria-label`.** It names the
  table *and* the region, and `role="region"` with no accessible name is not
  exposed as a landmark at all (the same trap `DomainCard`'s `<section>` was
  in); the component falls back to the literal "Table" rather than going unnamed,
  which tells a keyboard user only that they have landed on something. The
  scroller takes `tabIndex={0}` because a container a pointer can pan and a
  keyboard cannot is the same 2.1.1 failure this component already refuses to
  let `onRowClick` commit. It draws **no** ring of its own; `tokens.css` has one.

  **`loading` outranks `empty`, and `empty` now has a default** (1.7.0). The two
  used to be one rendering: a table still fetching and a table with nothing in
  it looked identical, so an operator on a slow link read "No exceptions" off a
  queue that had forty and walked away. `loading` renders `loadingRows`
  skeletons under a live header, so the column strip does not jump when the data
  lands, and the empty state may not flash before it. And the old guard was
  `rows.length === 0 && empty`, so a table that omitted the prop rendered a
  header strip over a void — which reads as "still loading" or "the app is
  broken", never as "there is nothing here". Every screen that forgot the prop
  had that bug and none of them looked wrong in review, because the header made
  the card look populated. The default is deliberately flat; pass an
  `EmptyState` the moment you can say what is missing or what would end it.

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
- **KPI cards:** label (`--font-size-label`, 11px caps, `--text-tertiary`) →
  display numeral (`--font-size-kpi`, tabular) → sub-line with mono delta pill.
- **Type sizes: as of 1.7.0 every size the system paints has a name.** Seven
  were added, and all seven were already shipping as `text-[Npx]` literals
  *inside this package's own components* — 27 of them, across 8 components, at 9
  distinct sizes that appeared nowhere in `tokens.css`. App code has been
  forbidden from writing a raw size since 1.0.0; the package was doing it, which
  meant a consumer could not name those sizes, could not override them, and
  could not be linted against them.

  | token | px | where it is painted |
  |---|---|---|
  | `--font-size-kpi` | 25 | KPI numeral (display 700, tabular) |
  | `--font-size-ribbon-h1` | 24 | the ribbon's headline |
  | `--font-size-h1` | 20 | the h1 on a page with **no** ribbon |
  | `--font-size-h2` | 16 | section heading |
  | `--font-size-h3` | 14.5 | card title |
  | `--font-size-body` | 13.5 | prose, buttons, rail labels |
  | `--font-size-control` | 13 | the value inside a form control |
  | `--font-size-table` | 12.8 | table cell |
  | `--font-size-ribbon-meta` | 12.5 | ribbon subtitle, `RibbonButton`, the actions slot |
  | `--font-size-mono` | 12 | dates, IDs, deltas |
  | `--font-size-ui-sm` | 12 | `Chip size="sm"`, `Tooltip`, toast action, calendar day |
  | `--font-size-meta` | 11.5 | KPI sub-line, `FormField` hint and error |
  | `--font-size-label` | 11 | KPI label, caps label |
  | `--font-size-micro` | 10.5 | ribbon eyebrow, `DataTable` column header |
  | `--font-size-badge` | 10 | `CertChip`, the KPI delta pill (mono) |
  | `--font-size-seal` | 9 | the seal's "911" lockup — logotype, nothing else |

  Utilities in both Tailwind ports: `text-micro`, `text-badge`, `text-meta`,
  `text-ui-sm`, `text-control`, `text-ribbon-h1`, `text-seal`. **No rendered
  pixel changed.** Naming and resizing are separate passes on purpose — whether
  10.5 and 11 should be one size is a real argument and a *visual* change, and
  it does not belong in the same commit as a rename.

  **A correction this file owes you.** From 1.0.0 until 1.7.0 the two bullets
  above said the ribbon eyebrow and the `DataTable` column header were "11px
  caps". They are 10.5px, and always were: `scripts/contrast-audit.mjs` has
  scored both at `px: 10.5` since the audit existed, so the instrument was right
  the whole time the prose was wrong. Both mentions are fixed above. It is the
  same failure mode this system has now recorded twice — a comment cannot fail a
  build, so it drifts and the claim quietly becomes false (see the header of
  `tokens.css`, and `--text-tertiary`'s old "labels ≥12px" annotation). Trust
  the audit and the token file over any sentence in this document, including
  this one.

  **`--font-size-ribbon-h1` (24px) and `--font-size-h1` (20px) both exist, and
  both are correct.** This is the one place in the system where two tokens
  genuinely describe one HTML element. The ribbon is a painted band with its own
  gradient and its own scrim, and its title is sized against *that band* rather
  than against the page. `--font-size-h1` is for a page with no ribbon at all —
  sign-in and the kiosk, which is exactly where its single consumer lives.
  Before 1.7.0 the ribbon simply hard-coded 24px, so the system's stated "h1
  size" was a size that 95% of its h1s did not use.
- **Empty and loading are components** (1.7.0). `EmptyState` and `Skeleton` live
  in `src/feedback.tsx`, which is the only module besides `contract.ts` with
  **no `"use client"`** — neither holds state, takes a handler, or touches the
  DOM, so a server page can render an empty state without a client wrapper
  beside it.

  ```jsx
  <DataTable columns={cols} rows={rows} loading={pending} aria-label="Exception queue"
    empty={<EmptyState
      title="No exceptions in this pay period"
      body="Punches are matched overnight, so today's exceptions appear tomorrow morning."
      action={<Button onClick={clearFilters}>Clear filters</Button>}
      icon={<Check size={18} />} />} />
  ```

  - `title` says **what is absent, in the operator's words and scoped to this
    screen** — "No exceptions in this pay period", never "No data". A title that
    could sit on any screen in the app tells the reader nothing about the one
    they are on, and "No rows" collapses *an empty queue* and *a filter that
    matched nothing* into one sentence when those need opposite responses.
  - `body` says **why**, which is what makes an empty state teach instead of
    apologise. `action` is **the thing that ends the state**; without one an
    empty state is a dead end, and a dead end is where an operator starts
    inventing a workaround. `icon` is decorative and rendered `aria-hidden`.
  - **`EmptyState` renders no heading, at any rung** — deliberately. It almost
    always sits inside a `DomainCard` that already owns one, and `titleLevel`
    exists because the outline is the page's decision, not a component's. A
    component that plants an `h3` wherever it lands re-opens that one card at a
    time, and nothing shows it until someone runs the outline.
  - `Skeleton` takes `size="text" | "row"` and gets its **width from
    `className`** (`w-2/3`, `w-24`) — a width prop taking a CSS length is how
    raw values get back into app code through a component that exists to keep
    them out. It is always `aria-hidden`: a skeleton is a picture of content
    that does not exist yet, and announcing it hands a screen-reader user a
    table of blanks to walk. The loading state belongs on the container, as
    `aria-busy` plus a `role="status"` — `DataTable` does both; an app
    hand-rolling a skeleton layout owes the same.
- **Motion is scoped by distance, not by importance.** Three durations, and the
  choice between them is mechanical: `--e911-dur-fast` (110ms) for a hover or a
  press, `--e911-dur` (170ms) for a colour change, and `--e911-dur-slow` (240ms,
  new in 1.7.0) for anything that changes **size or position** — the rail
  opening from 64px to 224px, a `Dialog` entering, a `Select` list unrolling.
  Until 1.7.0 the 170ms step was carrying both, and those are not the same
  movement: a colour swap reads as instant at 170ms, a 160px layout shift reads
  as clipped. 240ms is the top of the band product UI can spend before an
  operator mid-task starts *waiting for the interface*.

  **Reduced motion is handled once, with one exception you must know about.**
  `tokens.css` clamps every transition and animation under `.e911-app` to
  0.01ms, including on the shell root itself, so do not re-implement it for
  anything finite. It does **not** solve an *infinite* animation: a loop clamped
  to 0.01ms keeps looping, so the browser samples it at an arbitrary point every
  frame and the element strobes — faster motion than before the user asked for
  less. Anything that repeats forever therefore also carries
  `motion-reduce:animate-none` and must be legible parked at its resting style;
  `Skeleton` is the system's one instance, and it rests as a fully opaque
  `bg-tint` bar rather than vanishing into a blank card. `Skeleton`'s 2s pulse is
  Tailwind's `animate-pulse` and deliberately **not** a token: the system's
  durations top out at 240ms, a shimmer at 240ms is a strobe, and a token with
  one consumer is how `--font-size-h1` ended up naming a size almost nothing
  renders.

## Component recipes (Tailwind, using the preset)

```jsx
// Primary button
<button className="h-ctl px-3.5 rounded-sm bg-action text-action-fg
  font-semibold text-body hover:bg-action-hover transition duration-fast">

// Domain card (certifications)
<section className="bg-card border border-line border-t-edge border-t-edge-gold
  rounded shadow-card p-4">

// Status pill — the word is not optional, at any of the five tones
<span className="inline-flex items-center gap-1.5 h-[21px] px-2 rounded-pill
  text-label font-semibold bg-warn-soft text-warn">
  <i className="size-[5px] rounded-pill bg-current" />Due soon</span>
// …and the two added in 1.7.0. `bg-info-soft text-info` · `bg-neutral-soft
// text-neutral` — same geometry, same dot, same word. Before reaching for
// neutral, read rule 4: if the label reads the same with no pill, use no pill.

// Disabled control — the tokens, not an opacity of your own (rule 12)
<button disabled className="h-ctl px-3.5 rounded-sm bg-disabled text-disabled-fg
  border border-line-disabled font-semibold text-body">

// Selected row / option — outranks hover, so it survives being hovered
<li aria-selected className="bg-selected border-l-2 border-line-selected">

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
- A `neutral` pill on a label that reads identically without one — that is no
  pill, not a quiet pill (rule 4). Likewise a tone picked because none of the
  other four fitted: `neutral` means "known, and carries no judgement", never
  "undecided"
- A raw `text-[Npx]` anywhere, now including **inside this package** — every
  size the system paints has a token as of 1.7.0, and a literal is how 12.5px
  ended up written in eight places and 10.5px documented as 11px for seven
  versions
- A disabled state built from `opacity-*` or a grey of your own instead of
  `--surface-disabled` / `--text-disabled` / `--border-disabled` (rule 12); and
  `--surface-tint` used for a *selected* row, option or day, which makes hover
  and choice the same colour
- A local `::selection`, `caret-color` or `::placeholder` rule, or a scrollbar
  redrawn with `::-webkit-scrollbar` instead of tinted with `scrollbar-color`
  (rule 13)
- A `DataTable` inside your own `overflow-x-auto` wrapper — the component owns a
  named, focusable scroll region, and wrapping it nests a second scroller that
  has neither. A `DataTable` with no `aria-label` is the same block: the region
  then announces itself as "Table"
- A blank card while data loads, or an empty state that says "No data" / "No
  rows" — use `Skeleton` and an `EmptyState` whose title says *which* emptiness
  this is, on *this* screen, and whose `action` can end it
- Something that changes size or position animated on `--e911-dur` (170ms)
  rather than `--e911-dur-slow`; a local `prefers-reduced-motion` block for a
  finite transition, which `tokens.css` already handles; or an **infinite**
  animation *without* `motion-reduce:animate-none`, which the global clamp turns
  into a strobe rather than stopping
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
