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

  **The control that ENDS THE SESSION takes its own slot, `railSessionAction`**
  (1.10.0), and is rendered below a divider and a doubled gap. It is a slot
  rather than "put it last" because the shell cannot tell a preference from an
  exit — both arrive as opaque children, and a rule like "separate the last one"
  puts the divider in the wrong place the first time an app orders its footer
  differently, with nothing to catch it. The measurement: the whole rail sits on
  a 50px pitch, so sign-out was 6px below the theme toggle — the control a
  dispatcher reaches for IN A DARK ROOM, which is the condition under which they
  can least see what they are aiming at, one finger-width from ending the
  shift's session. It is deliberately not a confirmation step: sign-out destroys
  no data, and a confirm on every sign-out is a cost paid at every shift change.

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
  (`--font-size-body-sm`, 12.5px — this was `--font-size-ribbon-meta` until
  1.8.0; see the type-scale section for why the ribbon does not own that size).
  Primary page actions live inside the ribbon,
  right-aligned (white button = primary, ghost = secondary).

  **Everything right-aligned goes in `actions`, including plain text.** That
  slot carries `--ribbon-actions-scrim`, and it exists because the gradient's
  gold end is 2.4:1 against `--ribbon-text`: measured across 1024/1440/1920px,
  ribbon text holds 4.5:1 only to about 55% of the width. A freshness stamp or a
  record count dropped anywhere else on the ribbon fails AA at most window
  sizes. Size it with `text-body-sm` — the same step `RibbonButton` uses, so app
  code never writes a raw 12.5px literal to line up with it.

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
  a landmark — and takes `titleLevel` so the page's heading outline is the app's
  decision, not the component's.

  **`titleLevel` defaults to 2 as of 1.10.0**, not 3. The ribbon renders the
  `h1`, so a card directly under it is the page's second rung, and that is the
  case a card is almost always in. It defaulted to 3 from 1.4.0 — the value the
  component hard-coded before the prop existed — and leaving it there left the
  trap the prop was built to remove fully armed: an audit of one consuming app
  found the `h1` → `h3` skip on most of its routes, one of them carrying eleven
  `h3`s and no `h2` at all, which is one flat rung, so "jump by section" did
  nothing. A default that is wrong at nearly every call site is not an escape
  hatch, it is the bug with a workaround beside it. Pass 3 or lower for a card
  genuinely nested under another card's `h2`. Sizing does not follow the rung —
  a card title is `--font-size-h3` whatever level it renders at, because the
  outline is about structure and the type scale is about density, which is the
  whole reason this is a level prop and not a "make it bigger" one. Do NOT
  bridge the gap with an `sr-only` heading of your own; that was the workaround
  this prop replaced.
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

  **Every pixel in the paragraph above is the DESK one.** Since 1.10.0
  `tokens.css` raises `--control-height` to 44px, `--control-height-sm` to 36px,
  `--row-height` to 52px and `--font-size-control` to 16px under
  `@media (pointer: coarse)` — so on a wall tablet `md` and `tap` paint the same
  box, and the size names are a map of NAMES to tokens rather than of names to
  numbers. Anyone reading "32px" off this file while debugging a tablet
  screenshot is reading the wrong device's value; read the block at the end of
  `tokens.css` before quoting any of them. Four things about it are worth
  carrying:
  - **`pointer: coarse` means the PRIMARY input mechanism**, not "has a
    touchscreen somewhere". A desk machine with a touchscreen and a mouse
    reports `fine` and none of this reaches it — which is what keeps a blanket
    raise from being blunt.
  - **16px is not a taste call and the threshold is not ours.** Under it, iOS
    zooms the page when a field takes focus, which moves the layout under a
    dispatcher's finger mid-entry. The sanctioned fixes people reach for first —
    a scale lock in the viewport meta, a local `text-[16px]` — are a 1.4.4
    failure and a review block respectively.
  - **`--row-height` had to move with them.** Growing a control inside a fixed
    row spends the row's clearance, and the clearance is the whole margin for
    error: measured on one consumer's approvals queue, raising the buttons alone
    took the vertical gap between THIS person's Approve and the NEXT person's
    from 12px to 4px, in a column of identically drawn buttons pressed by a
    gloved hand. A mis-tap there does not fail and ask again — it succeeds
    against the wrong wage record. 52 is derived, not chosen: `--row-height` is
    `--control-height` + 8px on the desk, and 44 + 8 keeps that promise.
  - **`sm` goes to 36 and not 44** deliberately: at 44 it would BE `tap` and the
    size would stop meaning anything — a filter row as tall as the primary
    action beside it. `size="tap"` still exists on a coarse pointer, because it
    is what a consumer asks for when a control is the primary finger target on a
    touchscreen desk machine too.

  **A screen a finger uses takes `size="tap"`,** which paints the control at
  `--tap-target`. One prop across the whole family, so a kiosk form is coherent
  instead of one raised control beside four default ones:

  ```jsx
  <FormField id="end" label="Last day off" size="tap">
    {(props) => <DateField id={props.id} size="tap" value={end} onChange={setEnd} />}
  </FormField>
  <Button size="tap">Record</Button>
  ```

  **A screen bolted to a wall takes `<Button size="kiosk">`** (1.11.0), which is
  `--kiosk-target` (64px) **and** `--font-size-kiosk` (18px). It is the one size
  where type follows height, and that is the point of it: `tap` answers "a
  finger, not a mouse", and a kiosk is a different question — a standing
  dispatcher, at shift change, often gloved, reading a 64–80px control rather
  than a 44px one. A 16px label inside a 64px button is not the same design as a
  16px label inside a 44px field.

  Four rules come with it, and the first is the reason the tier exists at all:

  - **Do not reach for `className="text-[18px]"`. It has not worked since
    1.10.0, and it fails silently.** `Button` labels itself from
    `--font-size-control`, and `.text-control` is emitted AFTER every
    `.text-[Npx]` in the generated sheet at the same specificity — measured on a
    clean 1.10.1 build, `.text-body` 27735, `.text-[18px]` 28819,
    `.text-control` 28981 — so the caller's value loses on source order with no
    error, no warning, and the class sitting right there in the DOM. That is not
    a bug to route around: type is this package's decision, and the tier is the
    supported way to ask for a bigger one.
  - **`kiosk` does not move under `pointer: coarse`,** unlike `sm`/`md`/`tap`
    above. 64px and 18px on a desk machine too — because a kiosk is previewed,
    screenshotted and reviewed on a desk machine, and a tier that shrank there
    would be a tier nobody could check from a chair.
  - **`Button` is the only component that offers it.** `Chip`, `Select`,
    `DateField`, `FormField`, `Checkbox` and `Radio` still top out at `tap`: a
    64px checkbox is a tile and a 64px Select trigger is a panel. The type is
    `ButtonSize`, a widening of `ControlSize`; reach it as `ButtonProps["size"]`.
  - **Delete the control's own `min-h-*` in the same edit.** A kiosk that has
    been carrying `min-h-16`/`min-h-20` as its working height override is
    carrying two heights once it opts in, and which one wins is emit order
    again. At `wrap`'s default the component sets `height`, so a caller's
    `min-height` still wins and an 80px hero stays 80px; pass `wrap` and the
    component's `min-height` outranks yours and that hero silently becomes 64px.
    Ask for one height, from one place.

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

  **`cn` is a plain join, so a className you pass may or may not win — and
  nothing you can see from the call site tells you which.** There is no
  tailwind-merge here: both classes reach the DOM, both rules apply, and the one
  the browser paints is whichever Tailwind emitted LAST in the compiled sheet.
  Reversing the order inside `cn` changes nothing, in any case ever measured
  here, in either direction.

  **The collisions that actually happen are same-family ones,** which is what
  makes this worth a section of its own. Until 1.10.1 this block described a
  three-tier order — core → theme → arbitrary — which is true and predicts
  almost none of them: the real question is never "core versus theme", it is
  `h-ctl` against `h-16`, or `bg-card` against `bg-action` — two utilities of
  the same kind, both from this system's own scale, where nothing about either
  one suggests a winner. Measured against a real compiled sheet:

  | component's own class | caller appends | renders | |
  |---|---|---|---|
  | `h-ctl` | `h-tap` | 44px | caller wins |
  | `h-ctl` | `h-16` | **32px** | **override dead** |
  | `rounded-sm` | `rounded-xs` | 5px | caller wins |
  | `rounded-sm` | `rounded-pill` | **8px** | **override dead** |
  | `bg-card` | `bg-tint` / `bg-sunken` | applied | caller wins |
  | `bg-card` | `bg-action` | **card** | **override dead** |
  | `bg-tint` | `bg-card` | **tint** | **override dead** |
  | `font-medium` | `font-semibold` | 600 | caller wins |
  | `font-semibold` | `font-medium` | **600** | **override dead** |
  | `text-body` | `text-ui-sm` | 12px | caller wins |
  | `text-body` | `text-h1` | **13.5px** | **override dead** |

  In the first four families the emitted order is the utility's NAME within the
  family, core scale values and this system's theme values interleaved in one
  sorted run — `h-16` < `h-ctl` < `h-tap`, `rounded-pill` < `rounded-sm` <
  `rounded-xs`, `bg-action` < `bg-card` < `bg-tint`, `font-medium` <
  `font-semibold`. **The type scale does not follow that rule**, which is the
  half that catches people: `text-h1` and `text-kpi` are emitted BEFORE
  `text-body`, while `text-control`, `text-ui-sm` and `text-micro` come after
  it — so half the scale can override a component's own size and half silently
  cannot, ordered by nothing a reader can infer from the names.

  **The "arbitrary always wins" half of the old note is also no longer safe.** A
  bare `text-[18px]` is emitted after the multi-property theme sizes and before
  the rest, so it beats `text-body` and LOSES to `text-control` — which is
  exactly the token `Button` moved onto in 1.10.0. A caller sizing a Button with
  a px literal today gets the component's size and a class attribute that reads
  like it got theirs.

  **So do not reason about this from the class names at all.** The winner is a
  fact about the compiled stylesheet, not about your string or your intent; if
  you genuinely need to know, grep the built CSS for the two rules and compare
  line numbers. That is the only instrument here that is not guessing — and this
  project has twice shipped a checker that was green over something it never
  evaluated.

  **It has already shipped a bug, on the worst screen it could have.** A kiosk
  button written `h-16` rendered at 32px for as long as its file existed — a
  control meant to be 64px, on a wall tablet, pressed by a gloved hand at shift
  change, with `h-16` sitting in the DOM the whole time. A mis-tap at 3am is
  what that costs, and nothing in either repo could see it.

  **The rule that survives all of it: never decide a system component's
  appearance from the outside.** Not its height, not its fill, not its weight,
  not its radius, not whether its label wraps. Use the prop — `size`, `variant`,
  `tone`, `wrap` — and if the axis you need has no prop, that is a PR here, not
  a className. (`wrap` exists for precisely this reason: `whitespace-nowrap` is
  in `Button`'s own class string and every escape from it, the arbitrary
  `[white-space:normal]` included, loses on emit order. The decision had to
  become reachable from the call site, because the label length is.) Layout
  utilities on the component's own box — `mt-4`, `w-full`, `flex-1`, `min-w-0` —
  collide with nothing the component sets and stay fine.

  **The one escape that works is specificity, and only this package may use
  it.** A caller's utility is (0,1,0), so a rule written inside a component at
  (0,3,0) cannot be tied by any class a consumer passes, whatever the emit order
  does. `Select` and `DateField` mark an errored control that way, off
  `:enabled[aria-invalid="true"]` — see the `FormField` note below for the
  failure that forced it. An app cannot reach for this: a local
  higher-specificity rule is a stylesheet, which rule 1 forbids.

  **`aria-invalid` is the error channel, and it is a real ARIA attribute for a
  reason.** `FormField` marks its child by putting `aria-invalid` in the props
  object it hands down, and both `Select` and `DateField` declare it and read it
  alongside their own `invalid` prop. The className channel cannot carry this:
  `FormField`'s own `border-line-control` and a control's `border-bad` are each
  (0,1,0), `cn` is a plain join, and the sheet picks the grey — in both themes,
  measured — so a field was announced invalid and drawn valid. One red sentence
  under a form of five grey controls is what a supervisor correcting a punch
  actually saw. A bespoke `invalid` prop would not have done it either: apps
  write `<input {...props} />`, and a non-DOM prop makes React log "Received
  `true` for a non-boolean attribute" for every native control in error. An ARIA
  attribute spreads onto anything, is already what assistive technology reads,
  and carries enough specificity to make the two channels physically the same
  fact.
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
  | `--font-size-glance` | 64 | the value a distance-read surface exists to show |
  | `--font-size-glance-sm` | 28 | the one line of text beside it, same distance |
  | `--font-size-kpi` | 25 | KPI numeral (display 700, tabular) |
  | `--font-size-ribbon-h1` | 24 | the ribbon's headline |
  | `--font-size-h1` | 20 | the h1 on a page with **no** ribbon |
  | `--font-size-kiosk` | 18 | a control LABEL on a wall-mounted screen — `<Button size="kiosk">`. 18 at both pointer types (1.11.0) |
  | `--font-size-h2` | 16 | section heading |
  | `--font-size-h3` | 14.5 | card title |
  | `--font-size-body` | 13.5 | prose, buttons, rail labels |
  | `--font-size-control` | 13 | the value inside a form control |
  | `--font-size-table` | 12.8 | table cell |
  | `--font-size-body-sm` | 12.5 | supporting prose, field labels, empty rows, ribbon subtitle |
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

  **1.8.0 — the tier the scale stopped short of.** Everything from `kpi` down is
  *desk density*: a number on a card, on a machine at arm's length. A kiosk is
  not that surface, and the first consuming app proved it by **refusing** the
  scale rather than bending it — its wall clock and its punch confirmation were
  both raw literals, because 25px on a tablet bolted to a wall is a number an
  operator crossing the room cannot read. `text-glance` and `text-glance-sm` are
  those two sizes.

  Name them by the reading **condition**, not the mounting and not the device,
  so a pedestal kiosk, a wall board of who is on the floor, and a shift-change
  display all reach for the same two names. `glance` here does *not* mean "a
  summary at a glance" — that is a `KpiCard`. Neither token declares a
  line-height: the two literals they replace carry *different* leading at their
  only call sites, so a token value would be silently wrong at one of them.

  There is deliberately **no third token here for a control label**, even though
  the same kiosk sets its 64–80px buttons at three hand-tuned sizes. A control's
  label size belongs to the control, and this system already has the mechanism:
  `size="sm"` steps the type down with the height, while `size="tap"` does not,
  because tap is about what a finger can hit and not about what an eye can read.
  A wall-distance control is about both — so it is a size NAME, which carries
  height, padding and type as one decision, not a loose type token every author
  has to remember to pair with a tall button.

  **1.11.0 is that name: `<Button size="kiosk">`.** It is
  `--kiosk-target` (64px) and `--font-size-kiosk` (18px), which sits with
  `--font-size-control` rather than with the two above — a label you press
  belongs to the family of things you press, and `glance` stays read-only type,
  which is the distinction this section was defending all along. It is on
  `Button` only, via `ButtonSize`, not on `ControlSize`. The paragraph above was
  right about the family and wrong about the need: 1.10.0 pointed `Button` at
  `--font-size-control` and thereby killed every `text-[Npx]` a caller had on
  one, and the control tier turned out to top out at 16px — a form field's size,
  not a wall tablet's.

  **1.8.0 — `--font-size-ribbon-meta` is now `--font-size-body-sm`.** 12.5px was
  named in 1.4.0 after the first three places it appeared, which happened to be
  the ribbon's subtitle and its buttons. It is the most-used size in the first
  consuming app — 115 sites across 19 files — and **not one of those 19 files
  renders a `Ribbon`**. Inside this package only 2 of 10 uses are the ribbon; in
  `spec.html`, 4 of 22. The name has been wrong since it was written, and a
  sweep against the old one would have put the word `ribbon` on 115 table rows
  and field hints.

  The old spelling stays live as a **deprecated alias** — `--font-size-ribbon-meta`
  now resolves to `--font-size-body-sm`, and `text-ribbon-meta` still works in
  both Tailwind ports. Same 12.5px, same 1.35 leading: a rename must not resize.
  Removable in 2.0.0, once no source here and no consuming app names it; grep
  for the **utility** spelling as well as the custom property, because the class
  is what app code actually writes.

  Against `--font-size-ui-sm` (12px), the only token this can be confused with:
  `ui-sm` is text **inside a piece of chrome that has its own box** — a `Chip`,
  a `Tooltip`, a toast action, a calendar day. `body-sm` is the page's own small
  text: the paragraph, the field label, the empty row, the subtitle.

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
- **The inline message is a component** (1.8.0). `Callout` lives in
  `src/callout.tsx`, which like `feedback.tsx` carries **no `"use client"`** — a
  server page can render a standing notice with no client wrapper beside it.

  ```jsx
  <Callout tone="bad" kind="event" id="sign-in-error">{state.error}</Callout>

  <Callout tone="warn" title="29 CFR 778.105">
    A fortnight that straddles the workweek boundary is two workweeks for overtime.
  </Callout>
  ```

  It exists because the first consuming app hand-painted this shape in six files
  from one class string
  (`rounded-sm bg-{tone}-soft px-3 py-2 text-body text-{tone}`), some drawing a
  border and some not, because nothing said which was right — the `DataTable`
  scroll region again. Most of them announced nothing at all, so a dispatcher on
  a screen reader was told nothing when a warning appeared in front of them.

  **No count is given here on purpose.** Two attempts to state one were wrong
  within the hour: the first grepped `bg-*-soft` and counted a CLASS rather than
  a message, sweeping up tone→class lookup arrays and `aria-hidden` legend
  swatches; the second was accurate when written and stale two commits later.
  **A soft fill is not a callout. A soft fill WITH padding, rendering children,
  not `aria-hidden`, is.** Re-derive from that rule at the moment you need the
  number, and do not write the answer down here.
  - **`kind` says what the message IS, not how it looks** — `tone` is the only
    thing that changes a Callout's appearance. `"standing"` (the default) is part
    of the page as rendered: "This pay period is closed", "Coverage below minimum
    is computed from the posted roster". `"event"` is news: a credential refused,
    a punch the server rejected, a save that failed. Only `"event"` is announced,
    and `tone` still decides how loudly — `bad` interrupts (`role="alert"`), the
    rest wait (`role="status"`).
  - **Why the component cannot work this out, and why `Toast` can.**
    `role="alert"` fires when the node MOUNTS, so a standing note marked as an
    event interrupts a screen-reader user on every page load — seven times on one
    screen in the first app — and the operator's defence is to tune the channel
    out. A channel nobody trusts is worse than a quiet one, because the quiet one
    can still be fixed. Tone cannot settle it either: "This pay period is closed"
    and "Your punch was rejected" are both `bad`. A toast is ALWAYS new, which is
    the whole reason `toast.tsx` may derive its live region from tone alone. The
    default here is silence: **it costs one message, where the other default
    costs the channel.**
  - **A Callout carries a mark, and the mark is a SHAPE** — `warn` is the only
    triangle; the four circles differ by a check, a cross, an i and a dash. Five
    tone colours inside a 0.018 luminance band do not distinguish a tinted panel
    (rule 4), and a Callout's "word" is its own content, which the component does
    not supply. The mark is `aria-hidden` and deliberately not overridable; a
    screen reader hears "Error:", "Warning:", "Success:", "Note:" instead.
    `neutral` gets no word, because it names no severity.
  - **Pass `id` when the Callout explains a refused field**, and point that
    field's `aria-describedby` at it. Sign-in is the pattern: it moves focus to
    the first invalid input and describes it with the same node, so the sentence
    is read on arrival — which also covers an alert that fired before the
    assistive technology was listening. It has to, because **a live region
    announces a CHANGE**: submit twice, get the identical refusal, and the node
    never remounts and its text never moves, so the second attempt is silent.
    Move focus, or re-key the Callout.
  - `title` is emphasised text, **not a heading at any rung** — same reason as
    `EmptyState`. `action` is the thing that ends the state. Body text sits in the
    **tone colour**, as `FormField`'s error line does; ink on a soft fill is a
    pair `scripts/contrast-audit.mjs` does not measure.
  - **Known limit, and the sanctioned way out.** Urgency derives from `tone`, so
    `warn` + interrupting (a session-timeout countdown, a dropped live feed —
    caution by tone, but the operator is not looking) and `bad` + polite cannot
    be expressed today. Nothing in the first app needed either. When one appears,
    add a **third value to `kind`** — widening the union is additive and changes
    no call site. Do NOT add an `aria-live` prop, and do not set one at a call
    site: that is a second API for the same question, and the two will disagree.

    Two consumers have now hit this from opposite directions: one needed `warn`
    that interrupts, the other needed an `event` that must NOT interrupt — a
    preview that fires 350 ms after mount, reporting facts that predate the
    operator on its first appearance and genuine news on every later one, from
    the same element at the same call site. So the missing axis is not another
    `kind` value: there are three independent facts here — *is it new* (`kind`),
    *how urgent* (`tone`), and *may it interrupt* (currently derived from tone,
    which is the conflation). The fix is one optional politeness override. It is
    deliberately **not** in 1.8.0: two consumers hitting it from opposite ends is
    exactly enough evidence to design it properly and not enough to design it in
    a hurry.
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
<span className="inline-flex items-center gap-1.5 h-tag px-2 rounded-pill
  text-tag font-semibold bg-warn-soft text-warn">
  <i className="size-tag-dot rounded-pill bg-current" />Due soon</span>
// `h-tag`, `size-tag-dot` and `text-tag`, not the 21px, 5px and text-label
// this recipe printed until 1.8.0. This block is WHY the first two were
// tokenised: a recipe gets copied, so a literal here is a literal in every app
// that ever needed the shape in a slot no component fits. (`text-label` was
// simply wrong from 1.7.0 — it is the caps micro-label and carries +0.05em,
// which spaces out a short word in a small pill. `StatusTag` has always used
// `text-tag`; this line had not caught up.)
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
  `--e911-radius-xs` (5px, added 1.6.0), the **small-box corner**: any painted
  box whose short side is **20px or less**, which today means the `Checkbox`
  box, `CertChip`, and the `KpiCard` delta pill. Reaching for `xs` on a chip
  (28px), an input (32px) or a card is still the block — the scope is the
  number, not the component list, and anything 24px or over takes `sm`. The
  scope is a ratio: every corner in the system is 25–29% of its box's short
  side, which is why 8px on an 18px checkbox reads as a circle beside a `Radio`
  (44%) and why 8px on a 17px delta pill is clamped by the browser into a
  stadium — a `StatusTag`'s shape, on something that is not a status. 6px
  (30–35%) was the value both badges drew until 1.8.0; it is also Tailwind's own
  default `rounded-md`, i.e. the framework's number rather than a decision this
  system could defend; new fonts of any kind
- Status conveyed by color only; non-tabular digits in any numeric column
- A `neutral` pill on a label that reads identically without one — that is no
  pill, not a quiet pill (rule 4). Likewise a tone picked because none of the
  other four fitted: `neutral` means "known, and carries no judgement", never
  "undecided"
- A raw `text-[Npx]` anywhere, now including **inside this package** — every
  size the system paints has a token as of 1.7.0, and a literal is how 12.5px
  ended up written in eight places and 10.5px documented as 11px for seven
  versions. **1.8.0 did the same for metrics**: `h-[21px]`, `size-[5px]`,
  `h-[33px]` and `rounded-[6px]` are now `h-tag`, `size-tag-dot`, `h-ctl` and
  `rounded-xs`, and app code owes the same discipline for any height, radius or
  box the system already names. **What is banned is the NUMBER, not the
  brackets**: `h-[var(--kiosk-target)]` and `text-[length:var(--font-size-kiosk)]`
  inside this package are token references with no literal in them, spelled that
  way because a named utility would have to be declared in both Tailwind ports
  and a metric that resolves in one and silently drops in the other is this
  package's oldest failure shape. `h-[64px]` is the review block; the same box
  reached through its token is not
- **Two raw metrics remain in this package on purpose, and a sweep must not
  "fix" them**: the seal's `size-[30px]` and the ribbon's glow disc
  (`-right-[60px] -top-[80px] size-[240px]`). Both are artwork, not metrics —
  the first is a logotype's geometry, the second is one shape whose three
  numbers are meaningless apart. Neither has a second consumer, and a token
  with one consumer is how `--font-size-h1` came to name a size almost nothing
  renders. Both carry a comment at the call site saying so
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
- A hand-rolled inline message — a `bg-*-soft` panel with prose in it, with or
  without a border. Use `Callout`; it is the same block as a hand-rolled pill,
  and the reason is the 22 that shipped without announcing anything
- `kind="event"` on a message that was already true when the page rendered. An
  alert per page load teaches operators to ignore the channel, which is the one
  failure that cannot be fixed by fixing the next screen
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

## API reference

Every export, its props, and the neighbour it is most often confused with.

**It is here because there is nowhere else.** This package has no Storybook, no
dev server and no rendered gallery, so the only other description of an API is
the TypeScript source — which is excellent, and is a directory of files nobody
reads before writing a screen. The effect is measurable and one-directional:
**every export this document has never named has, so far, been an export nobody
used.** `Pagination`, `ToastProvider` / `useToast` and the ISO date helpers each
shipped undocumented and reached zero adoption in the first consuming app;
`TabPanel` and `DangerDialog` are used only because `Tabs` and `Dialog` led
people to them. Until 1.10.1 this file never named `Button`'s `variant` values
either, so a reader could not learn from the documentation that `quiet` exists.

The sharpest evidence that this is a documentation problem rather than a taste
one is the `label-caps` utility: it exists, was undocumented, and the identical
recipe — `text-label font-semibold uppercase tracking-[0.05em] text-faint` — is
hand-written across a consuming app in more places than the utility itself is
used. Measured, the two render identically. Worse, `text-label` already declares
`letter-spacing: 0.05em`, so the `tracking-[0.05em]` in every copy is a
review-blocking arbitrary value that changes nothing, and copies have already
drifted to a different tracking and a different size. A recipe that is not
published as a name gets transcribed, and a transcription drifts.

**Read this alongside the source, not instead of it.** Every entry below is
derived from the doc comments in `src/`, which carry the measurement and the
incident behind each decision. This is the index; it is deliberately not the
argument.

Three things hold across everything below:

- **The modules carrying no `"use client"` are `contract.ts`, `feedback.tsx`
  and `callout.tsx`** — so `cn`, `DOMAIN_EDGE`, the two rail constants,
  `EmptyState`, `Skeleton` and `Callout` render from a server component with no
  client wrapper file beside them. Everything else is a client component, with
  both consequences rule 11 describes. Check the directive at the top of a
  module rather than trusting this list; it is the kind of sentence that goes
  quietly false.
- **Sizes quoted here are the desk ones.** See the coarse-pointer block in the
  Controls section for what a wall tablet actually paints.
- **`className` support is not uniform, and it is load-bearing which.**
  `DataTable`, `FormField` and `Tooltip` accept none at all and no `id`, so a
  wrapper div is the only way to position or describe them. `EmptyState` and
  `KpiCard` take `className` but spread no `...rest`, so neither can take an `id`
  for an `aria-describedby`. `Button`, `Chip`, `StatusTag`, `CertChip`,
  `DomainCard`, `Callout` and `Skeleton` spread everything. And whatever a
  component accepts, read the `cn` note above before using it to change how
  something looks.

### Shell

**`AppShell`** — the icon rail, the mobile drawer, the skip link and the
`<main>` it names. Wrap once per app; the Ribbon and the page go in `children`.

| prop | type | |
|---|---|---|
| `items` | `RailItem[]` | primary destinations |
| `activeId` | `string` | matched against `RailItem.id`; sets `aria-current="page"` |
| `onNavigate` | `(id: string) => void` | called only for items with **no** `href` |
| `renderLink` | `RailLinkRenderer` | router-aware link; without it an `href` item is a plain `<a>` and costs a full page load |
| `footerItems` | `RailItem[]` | destinations for a different audience (Admin), rendered exactly like `items` |
| `railFooter` | `ReactNode` | non-destination controls — theme, avatar. Use `<RailAction>` inside it |
| `railSessionAction` | `ReactNode` | the control that ENDS THE SESSION, below a divider. See the rail section |
| `mainId` | `string` = `"main-content"` | id of the `<main>`; the skip link's target |
| `skipLinkLabel` | `string` = `"Skip to main content"` | |
| `skipLink` | `boolean` = `true` | off only for an app rendering its own **before** `AppShell` |
| `railPinned` | `boolean` | controlled pin. Pair with `onRailPinnedChange` |
| `defaultRailPinned` | `boolean` = `false` | uncontrolled initial state |
| `onRailPinnedChange` | `(pinned: boolean) => void` | persist under `RAIL_PINNED_STORAGE_KEY` |
| `children` | `ReactNode` | |

`RailItem` is `{ id, label, icon, href? }` — `label` is both the accessible name
and the text revealed when the rail opens. `RailLinkRenderer` receives
`{ href, className, children, "aria-label", "aria-current" }`.

**Consumer requirement:** the rail is `position: sticky`, which resolves against
the nearest scrolling ancestor. An app that wraps `AppShell` in anything
carrying `overflow: hidden|auto|scroll` silently gets the pre-1.8.2 behaviour
back — the rail sticks to a box that never scrolls, and the footer goes back
under the fold. If the rail stops following the page, look there first.

**`RailAction`** — a rail-shaped `<button>` for `railFooter` and
`railSessionAction`. Extends `<button>` attributes.

| prop | type | |
|---|---|---|
| `icon` | `ReactNode` | 16px stroke glyph |
| `label` | `string` | accessible name AND the revealed text. Keep it constant across a toggle's states — `aria-pressed` carries the state, and changing both says it twice |
| `active` | `boolean` = `false` | brand-soft fill, as an active destination |

**`SkipLink`** — WCAG 2.4.1, invisible until focused. `AppShell` renders one;
this export is for a page with no shell at all (sign-in, kiosk).

| prop | type | |
|---|---|---|
| `targetId` | `string` | id of the element to jump to |
| `label` | `string` = `"Skip to main content"` | |
| `className` | `string` | |

**`Ribbon`** — the page header. One per page, always; a second is a review block.

| prop | type | |
|---|---|---|
| `eyebrow` | `string` | the domain name. Kept on a condition — see the layout section |
| `title` | `string` | renders the page's `h1` |
| `subtitle` | `string` | one line |
| `actions` | `ReactNode` | **everything right-aligned goes here**, including plain text: this slot carries `--ribbon-actions-scrim`, and the gradient's gold end fails AA without it |
| `className` | `string` | |

**`RibbonButton`** — extends `<button>` attributes, plus
`variant?: "primary" | "ghost"` (default `primary`). White = primary, ghost =
secondary. Use it **inside `<Ribbon actions>`**; the ghost variant has no
resting fill of its own and takes its ground from that slot's scrim.

*Over `Button`:* `RibbonButton` is the only button drawn for the gradient. A
plain `Button` in the ribbon is a card-surface control on a painted band.

### Cards and data

**`DomainCard`** — the system's card, with the 4px domain edge. Extends
`HTMLAttributes<HTMLElement>` (minus `title`), so `id` and `aria-*` pass through.

| prop | type | |
|---|---|---|
| `edge` | `EdgeColor` | required. One domain, one hue — use `DOMAIN_EDGE` |
| `title` | `ReactNode` | when set, names the `<section>` so the card is a landmark, and renders a divider above `children` |
| `titleLevel` | `2 \| 3 \| 4 \| 5 \| 6` = `2` | the page's decision, not the component's. See the Cards section |
| `headerRight` | `ReactNode` | right side of the title row |
| `flush` | `boolean` = `false` | removes body padding (tables want edge-to-edge) and adds `e911-card-flush`, which tells `tokens.css` to draw focus indicators **inward** because this box clips |

An app-supplied `aria-label` or `aria-labelledby` wins over the generated one.

**Three plain classes cross from this component into `tokens.css`, and they are
a contract rather than an implementation detail.** `e911-card-flush` above is
one; the other two are `e911-card-edge`, on every card, and
`e911-card-edge-<hue>`, carrying the same value as `edge`. They are not Tailwind
utilities and they paint nothing on their own — they are hooks a stylesheet can
match that a utility class cannot express, and each has a rule waiting for it in
`tokens.css`. Two rules follow, and both have already cost something:

- **Never write them by hand.** A card built out of `border`/`rounded-md`/
  `bg-card` instead of `DomainCard` gets no hook, so it silently opts out of
  every treatment below; a hand-written `e911-card-edge-orange` on a box with no
  edge to recolour is a class with no CSS behind it, which is this package's
  most-repeated failure and reads as working code in every review.
- **Never restyle them.** They are matched under `.e911-app` in `tokens.css`,
  so an app rule of the same name is one specificity step away from a fight
  nobody can see in a screenshot.

**`KpiCard`** — a `DomainCard` with no title, so deliberately **not** a named
landmark: six landmarks called "Coverage" between the header and the first table
is rotor noise, not navigation.

| prop | type | |
|---|---|---|
| `edge` | `EdgeColor` | |
| `label` | `string` | caps label |
| `value` | `string` | **preformatted** — keeps tabular alignment honest |
| `delta` | `{ text: string; direction: "up" \| "down" \| "flat" }` | mono pill. The union is not exported; reach it as `KpiCardProps["delta"]` |
| `sub` | `string` | sub-line beside the delta |
| `className` | `string` | no `...rest`, so no `id` |

**`DataTable<Row>`** — the system's table, and the owner of its own horizontal
scroll region.

| prop | type | |
|---|---|---|
| `columns` | `Column<Row>[]` | |
| `rows` | `Row[]` | |
| `rowKey` | `(row: Row) => string` | |
| `rowHref` | `(row: Row) => string \| undefined` | **the way a row navigates.** One real link in the first cell, named after the row's subject |
| `rowLinkPurpose` | `(row: Row) => string \| undefined` | a SUFFIX on the link's accessible name (2.4.4). Structurally cannot violate 2.5.3, which is why there is no free-form label prop |
| `renderLink` | `RowLinkRenderer` | `{ href, className, children }` |
| `onRowClick` | `(row: Row) => void` | pointer convenience only. **Alone it is a 2.1.1 failure** — no tab stop, nothing in the a11y tree |
| `rowClickable` | `(row: Row) => boolean` | totals and subheads opt out, so a summary row stops claiming a cursor it cannot honour |
| `empty` | `ReactNode` = `"No rows to show."` | pass an `EmptyState` the moment you can say what is missing |
| `loading` | `boolean` = `false` | **outranks `empty`** — an empty state may not flash before the data lands |
| `loadingRows` | `number` = `5` | skeleton rows, under a live header, so the column strip does not jump |
| `aria-label` | `string` | optional in the type and **mandatory in review**: it names the table and the scroll region, and the fallback is the literal "Table" |

`Column<Row>` is `{ key, header, cell: (row, ctx) => ReactNode, align?: "left" |
"right", width? }`. `ctx.rowLink(content)` scopes the row's link to the subject —
call it **once** per row, or the component logs an error and the row has two tab
stops for one destination.

Since 1.10.0 the scroll region is a tab stop and a landmark **only while it
actually scrolls**, measured with a `ResizeObserver` on both the box and the
table. Before that, every table at desk width was a false tab stop and a
near-duplicate landmark inside its own card. Do not wrap one in your own
`overflow-x-auto`: that nests a second scroller, and the outer one — the one the
pointer hits — is the unnamed, unfocusable kind.

**`FormField`** — label above, control, hint OR error below. Validation
placement is a system decision, not a per-form one.

| prop | type | |
|---|---|---|
| `id` | `string` | |
| `label` | `string` | |
| `hint` | `string` | rendered only when there is no `error` |
| `error` | `string` | the app's words. Sets the red stroke, `aria-invalid`, and announces |
| `size` | `"md" \| "tap"` = `"md"` | **not** forwarded into the child props: `size` on an `<input>` is a real HTML attribute meaning width in characters. Pass it to a `Select`/`DateField` explicitly as well |
| `required` | `boolean` = `false` | see below |
| `children` | `(props) => ReactNode` | a function, so it cannot cross the server→client boundary — see rule 11 |

The child props are `{ id, required?, "aria-invalid"?, "aria-required"?,
"aria-describedby"?, className }`. Spread them onto whatever you render.

**`required` (1.10.0)** sets three things and needs all three: native `required`
for the constraint the browser enforces; `aria-required`, because `Select`'s
trigger is a `<button>` and `DateField` is a composite and native `required`
means nothing on either; and the WORD "(required)" inside the visible `<label>`,
so it lands in the accessible name. Not an asterisk and not a colour — a bare
`*` is unpronounced by some AT and meaningless to anyone who has not been told
the convention, and colour alone is 1.4.1. Before it, the system had no way to
say so at all: an audit of one consuming app found every control across seven
screens with `required=false` and `aria-required=null`, on forms asking a
dispatcher for "Kind of leave" and "First day off" with nothing marking which
could be left alone (WCAG 3.3.2).

**The error is also a status message (1.10.0).** `aria-describedby` is correct
and stays, but a description is spoken when you ENTER a field — so an operator
who types a wrong confirmation and tabs on heard nothing at all while the
sighted operator watched red appear (WCAG 4.1.3). `FormField` now mounts an
empty `role="status"` live region **from first render**, because a region that
appears at the same instant it gains text is not reliably announced, and keys
its child on a sequence number, so an error cleared and set again to the same
string still replaces a DOM node. The announcement carries the label, because a
polite region is heard out of context: "Those do not match." on a form of five
controls does not say which one. A field that renders **already** invalid says
nothing — that is not news, it is the state of the page, and `aria-describedby`
covers it.

**`FormField` cannot be a grid cell.** Its wrapper is an unconditional 340px
column with no `className` and no `id`. That is right for a form and wrong for a
table cell, and a consumer that needed the latter transcribed the control recipe
by hand. Until that is a prop, the honest answer is that this component owns its
layout.

### Controls

**`Button`** — extends `<button>` attributes. `type` defaults to `"button"`.

| prop | type | |
|---|---|---|
| `variant` | `"primary" \| "secondary" \| "quiet" \| "danger"` = `"primary"` | `quiet` is the label-only one — no border, no fill until hover. The union is not exported; reach it as `ButtonProps["variant"]` |
| `size` | `"sm" \| "md" \| "tap" \| "kiosk"` = `"md"` | `kiosk` (1.11.0) is 64px **and** 18px, at both pointer types. Button is the only component that offers it. The union is `ButtonSize`; reach it as `ButtonProps["size"]` |
| `wrap` | `boolean` = `size === "tap"` | let a long label wrap instead of pushing the page sideways |

`wrap` exists because the className escape hatch does not work here and that is
invisible from the outside: `whitespace-nowrap` is in the component's own class
string, and `whitespace-normal`, `text-wrap`, `whitespace-pre-line` and even the
arbitrary `[white-space:normal]` all lose on emit order. Measured, a
41-character label in a 180px column overflowed by 152.8px with every one of
them applied. `tap` defaults to wrapping because that size exists for phones,
kiosks and wall tablets, where a column narrow enough to matter actually occurs;
`sm`/`md` keep `nowrap`, because a desk-density button that silently grows to
two lines breaks the row it sits in.

`kiosk` keeps `nowrap` too, which reads backwards and is measured: `wrap` is
about label length against column width rather than about size, and a kiosk
label is a few words by construction because it is read from across a room. In
the real faces at 1024×768 the longest label on the first consuming kiosk —
"Start break" — is 97.4px inside the tightest box it has, a 222px action-grid
cell. Wrapping also swaps the fixed height for a `min-height`, which is the one
property a kiosk's own `min-h-*` override uses, so the two would fight. Pass
`wrap` explicitly for a genuinely long kiosk label, and drop the app-side
`min-h-*` when you do.

**There is no loading state.** Every write flow in the first consuming app
hand-writes `{pending ? "Filing…" : "Request leave"}`, and `disabled={pending}`
on a submit button drops focus to `<body>` — see Known gaps.

**`Chip`** — the filter chip. Extends `<button>` attributes; sets `aria-pressed`
from `active`.

| prop | type | |
|---|---|---|
| `active` | `boolean` = `false` | brand-soft fill + brand text. **Never a status colour** |
| `size` | `"sm" \| "tap"` = `"sm"` | no `md`: 28px is the filter row's own size |

*Over `Button`:* a Chip is a small stateful selector, a Button is a command.
*Over `StatusTag`:* a Chip is pressable; a StatusTag labels something.

**`Select<T>`** — a listbox combobox, not a native `<select>`. Focus stays on
the trigger and the active option is announced through `aria-activedescendant`,
so there is one tab stop. Typeahead, Home/End, and arrow keys that walk past
disabled options.

| prop | type | |
|---|---|---|
| `value` | `T \| null` | |
| `onChange` | `(value: T) => void` | |
| `options` | `SelectOption<T>[]` | `{ value, label, disabled? }` |
| `placeholder` | `string` = `"Select…"` | |
| `id`, `name` | `string` | `name` lands on the trigger `<button>`; a `Select` **does not submit a form value** — bind `value` yourself |
| `disabled` | `boolean` = `false` | |
| `invalid` | `boolean` = `false` | red stroke + `aria-invalid` |
| `size` | `"md" \| "tap"` = `"md"` | |
| `aria-invalid` | `boolean \| "true" \| "false"` | **declared, not incidental** (1.10.0). Read alongside `invalid`, so whichever channel says the control is bad, both the announcement and the stroke follow |
| `aria-label` / `-labelledby` / `-describedby`, `className` | | |

**`DateField`** — an ISO text field with a calendar popover. Deliberately
`Date`-free: all arithmetic runs on `{y, m, d}` integers, because
`new Date("2026-08-14")` parses as UTC midnight and reads back as the 13th
everywhere west of Greenwich, and a roster off by one day is an incident.

| prop | type | |
|---|---|---|
| `value` | `string` | `YYYY-MM-DD`, or `""` for empty. Never a `Date` |
| `onChange` | `(value: string) => void` | fires for a valid date **and for a real date the bounds refuse** — see below |
| `onReject` | `(r: DateFieldRejection) => void` | `{ text, value?, reason, limit? }` |
| `min` / `max` | `string` | ISO; compared lexicographically, which is exactly correct for zero-padded dates |
| `isDateDisabled` | `(iso: string) => boolean` | extra blackout days — holidays, closed shifts |
| `disabled` / `invalid` | `boolean` = `false` | |
| `size` | `"md" \| "tap"` = `"md"` | **reach for this, not `className="h-tap"`**: className lands on the WRAPPER, so a height utility there drew a 44px box around a 32px input and nothing warned |
| `aria-invalid` | `boolean \| "true" \| "false"` | declared (1.10.0). Read alongside `invalid` and the field's own refusal state, so all three agree |
| `className` | `string` | **lands on the wrapper**, not the input |

`DateFieldRejectionReason` is `"unparseable" | "before-min" | "after-max" |
"unavailable"`. Rule 9 is this component's: **a typed value is never discarded
silently.** The text stays in the field, `aria-invalid` is set until the operator
edits it, and a real-but-refused date is emitted through `onChange` *as well as*
`onReject` — because a component cannot know an app's error copy, so it must not
be the thing that decides an entry never happened. Before 1.5.0 it reverted the
draft and fired nothing, and a leave form with `min={startDate}` filed twelve
hours against a day the employee never entered while the screen still said
"1 day".

**`Checkbox` / `Radio`** — real `<input>`s with `appearance: none`, so they stay
a checkbox to a form, to `:checked` and to a screen reader while the system
paints the box. Extend native input attributes (minus the ones they own).

| prop | type | |
|---|---|---|
| `checked` | `boolean` | controlled |
| `onChange` | `Checkbox: (checked: boolean, event) => void` · `Radio: (value: string, event) => void` | **overrides the native signature.** A generic form binding (`{...register()}`) will type-check in places and misbehave |
| `indeterminate` | `boolean` = `false` | *Checkbox only.* A DOM property with no attribute, which is why it is a prop; announced as **mixed**, never as checked, and `checked` still governs what submits |
| `name` | `string` | *Radio only, and REQUIRED* — it is what makes a set one control with one tab stop and arrow-key selection. A radio without it is a checkbox that cannot be unchecked, and nothing warns you |
| `value` | `string` | *Radio only* |
| `size` | `"md" \| "tap"` = `"md"` | moves the **box** only (`--check-size` 18px / `--check-size-tap` 24px). The label row is `--tap-target` at both |
| `invalid` | `boolean` = `false` | red box + `aria-invalid`. The MESSAGE is the app's |
| `children` | `ReactNode` | **the label, as a child** — the accessible name and part of the hit area |
| `className` | `string` | lands on the label ROW, not the box |

Three things are different from every other control here and all three are
deliberate: the label is a child (so clicking the row toggles, and rich content
works), the hit area is bigger than the painted box (44px around 18px — a 44px
checkbox is a tile, and a finger presses the row), and **neither goes inside
`FormField`**, which renders a label ABOVE a control. For a SET with one shared
label and one error, write the `<fieldset><legend>` or `role="radiogroup"`
yourself: the grouping element is where an app's layout and error copy live,
which is why there is no `RadioGroup` here.

*Over a bare `<input type="checkbox">` with `accent-color`:* that passes a token
check while leaving size, radius, disabled treatment and the focus ring to the
browser — a different control in Chrome and in Firefox, and the UA ring instead
of the system's two-tone one. It is a review block.

### Status, message, and the empty screen

**`StatusTag`** — pill + dot + word. Extends `<span>` attributes.

| prop | type | |
|---|---|---|
| `tone` | `Tone` | required |
| `children` | `ReactNode` | **required — the word is not optional at any of the five tones** |

**`CertChip`** — a mono chip for certification codes and IDs. Extends `<span>`
attributes.

| prop | type | |
|---|---|---|
| `tone` | `Tone` = `"neutral"` | `ok` and `neutral` stay a plain outline; only the tones asking to be READ get a fill |
| `children` | `ReactNode` | the code — "EMD", "CPR 21d" |
| `toneLabel` | `string` | the word the tone adds to what a screen reader reads |

`toneLabel` defaults to a generic severity word (`warn` → "warning", `bad` →
"critical", `info` → "note"; `ok` and `neutral` add nothing). Pass the specific
one where the app knows it — "expired", "adjustment", "superseded" — and pass
`""` where the visible code already says it: `<CertChip tone="bad">TDD
expired</CertChip>` does not need to announce "TDD expired, critical".

It exists because a chip is a code, not a status pill: no dot, no tone word, so
hue was the only carrier — and hue is the channel that goes first. The 1.10.0
left-rule ramp (nothing / 4px / 8px / 8px doubled) is the visual half; this is
the half a screen reader gets, since a reader reads no borders. It is rendered
as `sr-only` text rather than as `aria-label`, because this span has no role and
ARIA prohibits a name on one — a conforming reader is entitled to say nothing at
all.

**`Callout`** — the message a screen attaches to a region of itself. Extends
`HTMLAttributes<HTMLDivElement>` minus `role` and `title`. No `"use client"`.

| prop | type | |
|---|---|---|
| `tone` | `Tone` | the **only** thing that changes a Callout's appearance |
| `kind` | `"standing" \| "event"` = `"standing"` | what the message IS, not how it looks. Only `event` is announced, and `tone` still decides how loudly — `bad` interrupts, the rest wait |
| `title` | `string` | emphasised text, **not a heading at any rung** |
| `children` | `ReactNode` | |
| `action` | `ReactNode` | the thing that ends the state |
| `id` | `string` | pass it when the Callout explains a refused field, and point that field's `aria-describedby` at it |

*Over `Toast`:* a toast is transient, floats in its own layer, and is ALWAYS
new — which is the whole reason `toast.tsx` may derive its live region from tone
alone and this cannot. *Over `StatusTag`:* a tag labels a row, a cell or a value
and carries a word; a Callout is a message with a place on the page.

**`EmptyState`** — what a screen says before it has anything to show. No
`"use client"`.

| prop | type | |
|---|---|---|
| `title` | `string` | WHAT IS ABSENT, in the operator's words, scoped to this screen: "No exceptions in this pay period", never "No data" |
| `body` | `ReactNode` | WHY. This is the half that makes an empty state teach instead of apologise |
| `action` | `ReactNode` | the thing that ends the state. Without one it is a dead end, and a dead end is where an operator starts inventing a workaround |
| `icon` | `ReactNode` | decorative, rendered `aria-hidden` |
| `className` | `string` | no `...rest` |

Renders **no heading at any rung**, deliberately: it almost always sits inside a
`DomainCard` that already owns one.

**`Skeleton`** — a loading placeholder. Extends `<div>` attributes. No
`"use client"`.

| prop | type | |
|---|---|---|
| `size` | `"text" \| "row"` = `"text"` | a **shape**, not a height in the `ControlSize` sense — see Known gaps. `row` paints a full `--row-height` table row |

Width comes from `className` (`w-2/3`, `w-24`): a width prop taking a CSS length
is how raw values get back into app code through a component that exists to keep
them out. Always `aria-hidden` — announcing it hands a screen-reader user a table
of blanks to walk. The loading state belongs on the container, as `aria-busy` +
a `role="status"`; `DataTable` does both, and an app hand-rolling a skeleton
layout owes the same.

**`ToastProvider` / `useToast`** — the transient outcome of a write. Mount the
provider **once at app root**: its viewport is `position: fixed`, so it must not
sit under a transformed ancestor, and it must live outside any Dialog's stacking
context so a toast confirming a dialog action is visible over that dialog.

| | |
|---|---|
| `ToastProviderProps` | `{ children, max?: number = 4 }` — oldest drop off past `max`, because a stack taller than that blocks content |
| `useToast()` | returns `{ toast(options): string, dismiss(id): void }`. The id is returned so a long-running task can dismiss its own |
| `ToastOptions` | `{ tone: Tone; word: string; message: ReactNode; duration?: number; action?: { label, onClick } }` |

`word` is required for the same reason `StatusTag`'s child is: status here is
pill + dot + word, and a toast leaning on its tint alone is unreadable to a
third of a shift rotation. `duration` defaults to 6000ms; **`0` pins the toast**
until it is dismissed by hand. `tone === "bad"` announces assertively and every
other tone politely — written as an equality test rather than a per-tone map, so
a sixth tone would announce politely by default, which is the safe end.

Both live regions are mounted from first render and stay empty, **outside** the
toast card, because a region created already populated is a coin toss and a
region torn down with each message is the same defect wearing a hat.

*Over `Callout`:* reach for a toast when the message has no place on the page —
a punch that landed, a save that succeeded, an undo. Reach for a Callout when it
belongs to a region of the screen.

**`Tooltip`** — the label an icon-only control needs. Opens on hover **and** on
`:focus-visible`, keeps its content permanently mounted as a `role="tooltip"`
so the description resolves the instant focus lands, and closes on Escape.

| prop | type | |
|---|---|---|
| `content` | `ReactNode` | |
| `children` | `ReactElement` | **a single element that renders a real DOM node and spreads its props** — usually a `<button>`. A component that swallows rest props is a silently inert trigger |
| `placement` | `"top" \| "bottom" \| "left" \| "right"` = `"top"` | flips when it would leave the viewport. The rail should pass `"right"` |
| `delay` | `number` = `350` | hover only; keyboard focus opens with no delay, because the operator is already committed |

*Over `title="…"`:* rule 5. A `title` never appears on touch, never on focus,
cannot be styled, and is announced on top of the `aria-label` it usually
duplicates. **But read Known gaps before putting a fact in a Tooltip at all.**

### Layers, tabs and paging

**`Dialog`** — a modal that owns focus, including when focus is already outside
it (rule 10).

| prop | type | |
|---|---|---|
| `open` | `boolean` | |
| `onClose` | `() => void` | fired by Escape, the close button, and the backdrop unless suppressed |
| `title` | `string` | renders the `h2`, wired to `aria-labelledby` |
| `description` | `ReactNode` | wired to `aria-describedby` |
| `footer` | `ReactNode` | right-aligned action row. Confirm last, matching the ribbon's order |
| `dismissOnBackdrop` | `boolean` = `true` | **off for destructive flows** — a mis-tap on a wall tablet should not discard work |
| `size` | `"sm" \| "md" \| "lg"` = `"md"` | **a WIDTH cap** (380 / 520 / 720px), not a control height. See Known gaps |
| `className`, `children` | | |

Rendered inline as a `position: fixed` layer rather than through a portal —
`react-dom` is a peer dependency whose types this package does not carry. Fixed
escapes `DomainCard`'s `overflow-hidden`; the one thing it cannot escape is a
transformed ancestor, so **mount dialogs from page level, not from inside the
Ribbon's translated actions row.** Escape peels one layer at a time: a nested
`Select` or `DateField` stops the event before it reaches the dialog.

**`DangerDialog`** — destructive confirmation. The typed word converts an
accidental tap into a deliberate act, which is why the backdrop does not dismiss
and Confirm starts disabled.

| prop | type | |
|---|---|---|
| `open`, `onClose`, `title`, `description`, `children` | | as `Dialog` |
| `confirmWord` | `string` | what the operator has to type out — a unit ID, a name |
| `confirmLabel` | `string` = `"Delete"` | |
| `onConfirm` | `() => void` | |
| `busy` | `boolean` = `false` | disables Confirm while the mutation is in flight, and the label becomes "Working…" |

The match is trimmed and case-insensitive: intent is proven by typing the word,
and a stray capital on a tablet keyboard is not evidence of a mistake. Reopening
clears the previous attempt.

**`Tabs` / `TabPanel`** — section tabs. Selection follows focus (automatic
activation), which is the APG default for panels already in the DOM. Roving
tabindex, so the set is one tab stop and the arrows move within it.

| prop | type | |
|---|---|---|
| `items` | `TabItem[]` | `{ id, label, disabled? }` |
| `activeId` | `string` | |
| `onChange` | `(id: string) => void` | |
| `children` | `ReactNode` | the `<TabPanel>`s, so they inherit the id namespace |
| `aria-label` / `aria-labelledby` | `string` | required unless the tablist is the only labelled thing on the page |
| `className` | `string` | |

`TabPanel` takes `{ tabId, children?, className? }` — `tabId` must match its
`TabItem`'s id, and it throws if rendered outside `<Tabs>`. It is focusable, so
tabbing out of the tablist lands on the panel, whose body is often a table with
nothing focusable of its own.

**The tablist is a horizontal scroller** (1.10.0), and that is not cosmetic:
with the default `overflow-x: visible` the buttons escaped the strip instead —
one consumer's five tabs squeezed onto two lines, still needed 390px against a
288px box, and widened the DOCUMENT to 407px on a 320px screen, where nothing
could scroll it back. Two tabs were unreachable by pointer, touch, keyboard and
every scroll API (WCAG 1.4.10). Consequences worth knowing: it snaps
(`x proximity`), the scrollbar is hidden and a measured edge fade is the
affordance instead, keyboard movement scrolls the focused tab to **centre**
(`nearest` loses to the snap and parks a focused tab outside the box), and
**the box clips vertically whether you ask it to or not** — a scroll container on
one axis resolves the other to `auto`, so the active rule sits on the last 2px
INSIDE the tab and the focus indicator is drawn inward via `e911-card-flush`.
Anything that must be seen has to be inside the box.

**`Pagination`** — first, last, a fixed-width window around the current page,
ellipses for the rest. Every target is a real 44px box rather than a 32px
control with an overhanging hit area: the buttons sit shoulder to shoulder, and
overlapping hit areas land the operator on page 7 when they aimed at page 6.

| prop | type | |
|---|---|---|
| `page` | `number` | **1-based** |
| `pageCount` | `number` | renders `null` when ≤ 1 |
| `onPageChange` | `(page: number) => void` | the one handler in the system not named `onChange` |
| `siblingCount` | `number` = `1` | pages either side of the current one |
| `aria-label` | `string` = `"Pagination"` | on the `<nav>` |
| `className` | `string` | |

The current page carries `aria-current="page"` — the border and fill alone say
nothing. Numbers are mono + tabular so the column holds as they widen from 9 to
10 to 100.

**`paginationSlots(page, pageCount, siblings)`** → `Array<number | "gap">` — the
same window logic, exported for an app that needs to render the control itself
(a compact mobile pager, a footer summary). Use it rather than reimplementing
the ellipsis rule.

### Data, helpers and types

| export | | |
|---|---|---|
| `cn(...parts)` | `Array<string \| false \| null \| undefined> => string` | a plain join. **Not a merger** — see the note in Controls before passing a className that changes appearance |
| `DOMAIN_EDGE` | `Record<"operations" \| "roster" \| "certifications" \| "qa" \| "training" \| "facilities", EdgeColor>` | the domain → hue contract. Import from the package ROOT (rule 11) |
| `RAIL_PINNED_STORAGE_KEY` | `"e911.rail-pinned"` | one key across every E911 app: a dispatcher who pins the rail has expressed a preference about rails, not about one app |
| `RAIL_PIN_LABEL` | `"Pin navigation"` | constant across both states by design — the button carries `aria-pressed`. Exported so a server component can label a skeleton rail with the same string |
| `parseIsoDate(value)` | `string => {y, m, d} \| null` | **strict**: rejects "2026-02-30" as well as anything that is not `YYYY-MM-DD` |
| `formatIsoDate(v)` | `{y, m, d} => string` | zero-padded |
| `todayIsoDate()` | `() => string` | today in the operator's own timezone, read through the LOCAL getters |

The three date helpers are the `Date`-free arithmetic `DateField` is built on,
exported so an app doing its own bounds maths gets the same answers. Use them
rather than `new Date(iso)`: that parses as UTC midnight and reads back as the
previous day everywhere west of Greenwich, which is a shift roster off by one.

**Exported types:** `Tone`, `EdgeColor`, `ControlSize`, `TooltipPlacement`,
`DateFieldRejectionReason`; the props interface of every component above, named
`<Component>Props` without exception, so a type error mentioning `SelectProps`
points at the `Select` entry; and the shapes `RailItem`, `RailLinkRenderer`,
`RowLinkRenderer`, `Column`, `CellContext`, `SelectOption`, `TabItem`,
`DateFieldRejection`, `ToastOptions`.

**Not exported, and reachable only through an indexed access:** `Button`'s
variant union (`ButtonProps["variant"]`), the choice size, and the inline unions
on `DialogProps["size"]`, `SkeletonProps["size"]`, `CalloutProps["kind"]` and
`KpiCardProps["delta"]`. A consumer cannot cleanly wrap `Button` today.
`useAnchoredLayer` and `useDismissOnOutsidePress` are exported from
`select.tsx` but **not** from the package root, so they are not public API.

## Known gaps

Stated plainly, because each of these has been rediscovered by a consumer who
had no way to know. None is a bug report — they are the shape of what this
system does not do yet, and a screen built without knowing them is built on an
assumption the package will not keep.

- **`cn` is not a merger, and a className that changes appearance is a coin
  toss.** The full rule and the measurements are in the Controls section. The
  short version: use the prop, and if the axis has no prop, that is a PR here.
  A kiosk button written `h-16` rendered at 32px for the life of its file.
- **`Tooltip` is unreachable on touch, so never put a fact in a `Tooltip` that
  is stated nowhere else.** Touch has no hover, and the component deliberately
  does not open on a press: a bubble under the finger only hides what was just
  tapped, and `onPointerDown` closes it besides. So on a wall tablet — the
  device this system exists for — `content` is unreachable to a sighted operator
  while a screen reader still reads the permanently-mounted copy. That asymmetry
  is a known gap and not a decision the touch guard should be read as settling.
  Until it has its own pass, a tooltip may only ever REPEAT something the screen
  already says.
- **The `--*-soft` family is isoluminant by construction, so a soft fill cannot
  carry meaning on its own.** In light the five fills are the `-100` tier of
  their hue and sit within **1.04:1 of each other**; in dark they are all
  14–15% alpha of their status colour over the same card, which is the same
  statement made a different way. That is nowhere near the 3:1 WCAG 1.4.11 asks
  of non-text that conveys state, and the five tone TEXT colours are inside a
  0.018 luminance band besides (rule 4). A tinted panel is therefore five shades
  of one grey to a dichromat and to anyone reading a dim tablet across the room,
  and **every soft fill in this system needs a second, non-colour carrier**:
  `StatusTag` has its dot and its word, `Callout` has a mark distinguished by
  SHAPE, `CertChip` has the left-rule width ramp, `Select` keeps a check mark
  and a font weight. Nobody removes one of those on the grounds that the fill
  exists — the fill is the weakest signal present, not the strongest. A new
  surface that paints `bg-*-soft` and nothing else is a 1.4.1 failure whichever
  tokens it used.
- **`forced-colors` support is partial and deliberately narrow.** Three things
  in the package survive Windows High Contrast on purpose. `Checkbox` and
  `Radio` hand the box back to the OS (`forced-colors:appearance-auto`, with the
  glyph plate hiding itself so the native mark is not doubled). `CertChip`'s
  left-rule ramp is a border WIDTH, which forced colours do not override. And
  the domain edge is restored by the `@media (forced-colors: active)` block at
  the end of `tokens.css`, which matches the `e911-card-edge` hooks described
  under `DomainCard` above: measured on one consuming app's live board, every
  card edge came back `rgb(0, 0, 0)` — orange for operations and teal for
  roster, the one signal this system carries across every E911 app, and under
  high contrast every card in the PSAP looked identical.

  **That block is the exception that shows where the line is, so read what it
  costs before copying its shape.** `forced-color-adjust: none` opts an element
  out of the user's OWN colour choices, and someone running forced colours needs
  those specific colours. The edge clears that bar on terms almost nothing else
  will: it is 4px tall, spans no text, conveys no state, and carries information
  that is otherwise entirely lost. It is also a pseudo-element rather than the
  border, because `forced-color-adjust` is all-or-nothing per element AND
  inherited — putting it on the `<section>` would opt the whole card out and
  every label inside it would then have to be restated in system colours by
  hand. **Text or a fill must never be given this treatment.** A `StatusTag`
  under forced colours loses its fill and keeps its dot and its word; that is
  the system working, not a second thing to fix.

  Nothing else declares a forced-colors treatment. In that mode every other hue
  this system paints — the tone fills, the brand-soft active nav, the two-tone
  focus ring — is replaced by a system colour, so whatever non-colour carrier a
  surface has is the whole of what survives. Design as if it is, and do not add
  a `forced-colors` block in app code: if a component needs one it needs it in
  every app at once, which is a PR here.
- **`size` means three different things across the API,** and TypeScript catches
  the crossings while a reader's model does not. `ControlSize` (`sm`/`md`/`tap`)
  is a painted HEIGHT; `DialogProps["size"]` (`sm`/`md`/`lg`) is a max WIDTH
  sharing two of its three literals with it; `SkeletonProps["size"]`
  (`text`/`row`) is a SHAPE. `size="md"` on a `Select` and on a `Dialog` are
  unrelated facts. The tier above `tap` closed in 1.11.0 — `Button` takes
  `size="kiosk"` at 64px/18px — but **only on `Button`**, so a kiosk form is
  still one raised button beside four 44px fields, and a consumer wanting a 64px
  `Select` or `DateField` is still reaching for `min-h-16`: `min-height` is a
  different CSS property from the component's `h-ctl`, and therefore the one
  override that cannot lose the cascade. Widening `ControlSize` itself is the
  next move and needs a design for each control, not a fourth entry in a table —
  a 64px checkbox is a tile, a 64px Select trigger is a panel.
- **There is no primitive for the outcome of a write.** `Button` has no loading
  state, and `disabled={pending}` on a submit button moves focus to `<body>`
  when it fires — traced on three separate flows in one consuming app, every one
  of them `BUTTON` → `BODY`, none of those pages carrying a live region.
  `Callout` documents re-announcement as out of scope, `Toast` exists but is
  transient, and `Dialog`'s trap recovers focus but only inside a dialog. An app
  writing a form today owes its own always-mounted live region and its own focus
  target, and every E911 app will owe the same one.

## Source of truth

The `e911-design-system` repo (`@e911/design-system` package) — `tokens/tokens.css`
(canonical), `tokens/tailwind.preset.js`, `tokens/tokens.json`,
`tokens/tokens.scss` (build-time math only), `src/` (React components).
This is a **separate repo from every app** — see the app repo's `SETUP.md`
or its own `.claude/skills/` copy of this file for how it's wired in.

**`tokens/spec.html` is not what this file said it was, and it is the one file
here you should not trust.** From 1.0.0 until 1.10.1 this section carried the
sentence *"`tokens/spec.html` renders every token and pattern for visual
review"*, which sent a new developer to a file that cannot show them the
component they came looking for. It is a **hand-written static HTML mock** —
zero references to React, its own `.card` / `.tag` / `.input` CSS, and no import
of anything in `src/`. It is therefore a third parallel implementation of this
system's surfaces, free to drift from both the tokens and the components, and it
already has: it carries no `Callout`, no `Pagination` and no `Tabs`, and its
sections stop at the handful of screens somebody once mocked by hand.

What it is genuinely good for is a token swatch sheet with no build step. What
it must not be used for is checking how a component renders, or as the reference
when writing one — for that there is only the source. **It should be deleted or
generated**; a hand-maintained third implementation is the same shape of failure
as the 10.5px documented as 11px for seven versions, with more surface area.

**Trust the audit and the token file over any sentence in this document,
including this one.** A comment cannot fail a build, so it drifts, and the claim
quietly becomes false — this file has now recorded that three times.
