/**
 * E911 Design System — Tailwind preset
 * v1.0.0 · "Terrazzo × Solstice" / "Grotesk Standard"
 *
 * Usage (each app repo's tailwind.config.mjs — must be .mjs, ESM export):
 *   import e911 from "@e911/design-system/tailwind.preset";
 *   export default { presets: [e911], content: [...] };
 *
 * Every color maps to a CSS variable from tokens.css, so [data-theme="dark"]
 * re-themes Tailwind utilities with zero config. Import tokens.css first.
 * See SETUP.md in the repo root for how a separate app repo wires this in.
 */
export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        canvas: "var(--surface-canvas)",
        card: "var(--surface-card)",
        sunken: "var(--surface-sunken)",
        tint: "var(--surface-tint)",
        "brand-soft": "var(--surface-brand-soft)",

        ink: "var(--text-primary)",
        muted: "var(--text-secondary)",
        faint: "var(--text-tertiary)",
        "brand-text": "var(--text-brand)",

        action: {
          DEFAULT: "var(--action-primary)",
          hover: "var(--action-primary-hover)",
          fg: "var(--text-on-action)",
        },
        brand: "var(--e911-brand)",

        // The two states every component was inventing for itself before 1.7.0.
        //
        // `disabled` is shaped like `action`, NOT like ok/warn/bad, and the
        // difference matters when you go to spell a utility. A TONE's DEFAULT is
        // ink — `text-warn` is the tone, `bg-warn-soft` is the ground under it.
        // A STATE is a fill with a foreground on it, so DEFAULT is the surface
        // and the label hangs off `fg`, exactly as `bg-action` pairs with
        // `text-action-fg`. Disabled is a fill with a label on it.
        //
        // Therefore the trio is `bg-disabled` / `text-disabled-fg` /
        // `border-line-disabled`. **`text-disabled` is NOT the label colour** —
        // it compiles to --surface-disabled, a near-white in light, so a label
        // written that way is white text on a white card. It type-checks, it
        // compiles, and it is invisible. An earlier draft of this comment
        // advertised the wrong middle name and two consumers caught it
        // independently before either shipped; the names are spelled out here so
        // the third one does not have to.
        disabled: {
          DEFAULT: "var(--surface-disabled)",
          fg: "var(--text-disabled)",
        },
        // Fill-only, so there is no `fg`: this system has no "selected text
        // colour" and inventing one would give `text-selected` a meaning nothing
        // needs. A selected row keeps --text-primary.
        selected: "var(--surface-selected)",

        line: {
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)",
          row: "var(--border-row)",
          disabled: "var(--border-disabled)",
          selected: "var(--border-selected)",
          /* `border-line-control` — the FORM CONTROL boundary, the only border
             tier held to 1.4.11's 3:1. Inputs, Select triggers, DateField.
             Cards and row rules keep DEFAULT; see tokens.css. */
          control: "var(--border-control)",
        },

        ok: { DEFAULT: "var(--status-ok)", soft: "var(--status-ok-soft)" },
        warn: { DEFAULT: "var(--status-warn)", soft: "var(--status-warn-soft)" },
        // Added 1.7.0. `info` and `neutral` exist so that `warn` means caution
        // again — see the long note in tokens.css. Still pill + dot + word.
        info: { DEFAULT: "var(--status-info)", soft: "var(--status-info-soft)" },
        neutral: { DEFAULT: "var(--status-neutral)", soft: "var(--status-neutral-soft)" },
        // `fg` is the label on a --status-bad FILL. Not Tailwind's `white`:
        // --status-bad is a dark red in light and a light salmon in dark, so one
        // fixed white label measures 6.5:1 in one theme and 2.95:1 in the other.
        bad: {
          DEFAULT: "var(--status-bad)",
          soft: "var(--status-bad-soft)",
          fg: "var(--text-on-danger)",
        },

        edge: {
          orange: "var(--e911-edge-orange)",
          teal: "var(--e911-edge-teal)",
          gold: "var(--e911-edge-gold)",
          green: "var(--e911-edge-green)",
          plum: "var(--e911-edge-plum)",
          blue: "var(--e911-edge-blue)",
        },
      },
      fontFamily: {
        display: ["Space Grotesk", "Segoe UI", "system-ui", "sans-serif"],
        body: ["Onest", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        body: ["13.5px", { lineHeight: "1.5", letterSpacing: "-0.004em" }],
        table: ["12.8px", { lineHeight: "1.45" }],
        label: ["11px", { lineHeight: "1.2", letterSpacing: "0.05em" }],
        h1: ["20px", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "700" }],
        h2: ["16px", { lineHeight: "1.25", letterSpacing: "-0.012em", fontWeight: "700" }],
        h3: ["14.5px", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "700" }],
        kpi: ["25px", { lineHeight: "1.1", letterSpacing: "-0.015em", fontWeight: "700" }],
        mono: ["12px", { lineHeight: "1.4" }],
        /* Ribbon subtitle, RibbonButton labels, and app content in the ribbon's
           actions slot. Added in 1.4.0 so app code stops copying the literal. */
        "ribbon-meta": ["12.5px", { lineHeight: "1.35" }],

        /* The eight sizes that were text-[Npx] literals inside this package's
           own components until 1.7.0. Values unchanged — this names what ships.

           THESE DECLARE FONT-SIZE ONLY, AND THAT IS THE WHOLE POINT.
           A `text-[10.5px]` literal sets font-size and nothing else, so every
           one of these elements has always inherited line-height 1.5 from
           `.e911-app`. A Tailwind fontSize tuple with a lineHeight member sets
           BOTH — so the first cut of these tokens, which carried the leading
           each role "should" have, would have retightened the ribbon eyebrow
           and its h1 by about 11px combined on every page header in every E911
           app, inside a commit whose message says nothing renders differently.
           One consumer caught it and pinned `leading-normal` at the call site
           to defend itself; that fix works and is the wrong layer, because the
           next consumer has to know to repeat it.

           So the extraction is honest: font-size only, leading still inherited,
           nothing moves. Deciding what leading a 10px mono badge actually wants
           is a real design question and gets its own pass.

           `micro` in particular MUST NOT declare letter-spacing. Its two
           consumers disagree — the ribbon eyebrow is 0.1em, the DataTable
           column header is 0.06em — so a token value would silently be wrong at
           one of them. Both keep their own explicit `tracking-*`. */
        micro: "10.5px",
        badge: "10px",
        /* The status pill's word. NOT `label` — same 11px, but label carries
           +0.05em caps tracking that a StatusTag must not have. */
        tag: "11px",
        meta: "11.5px",
        "ui-sm": "12px",
        control: "13px",
        /* Weight and tracking are kept here, unlike the others, because the
           literal they replace carried `font-bold tracking-[-0.015em]` at
           exactly these values — folding them in removes two utilities without
           moving anything. Line-height is still omitted for the reason above. */
        "ribbon-h1": ["24px", { letterSpacing: "-0.015em", fontWeight: "700" }],
        /* Logotype only — the seal's "911". Exempt from the contrast floor
           under 1.4.3, which is why it is scoped by name and nothing else may
           reach for it. No letterSpacing member: declaring one here and not in
           the v4 port made the two ports render the lockup differently. */
        seal: "9px",
      },
      borderRadius: {
        xs: "var(--e911-radius-xs)",     /* 5px  — Checkbox box ONLY; see
                                            tokens.css for why it is not 8px */
        sm: "var(--e911-radius-sm)",     /* 8px  — chips, inputs   */
        DEFAULT: "var(--e911-radius-md)",/* 10px — cards           */
        md: "var(--e911-radius-md)",     /* 10px — same, spelled out; without
                                            this key `rounded-md` silently falls
                                            through to Tailwind's own 6px, which
                                            is not one of the three radii. */
        lg: "var(--e911-radius-lg)",     /* 14px — ribbon, dialogs */
        pill: "var(--e911-radius-pill)",
      },
      spacing: {
        rail: "var(--rail-width)",
        "rail-expanded": "var(--rail-width-expanded)", /* w-rail-expanded — the
                                            hover/pinned width of the icon rail */
        row: "var(--row-height)",
        ctl: "var(--control-height)",
        "ctl-sm": "var(--control-height-sm)",
        tap: "var(--tap-target)", /* min-h-tap / size-tap — the touch floor */
        check: "var(--check-size)",         /* size-check — the Checkbox/Radio
                                               BOX. Its tap target is the label
                                               row, which is min-h-tap. */
        "check-tap": "var(--check-size-tap)",
      },
      zIndex: {
        rail: "var(--layer-rail)",
        popover: "var(--layer-popover)",
        dialog: "var(--layer-dialog)",
        toast: "var(--layer-toast)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
      },
      backgroundImage: {
        ribbon: "var(--ribbon-gradient)",
        dotgrid: "var(--surface-dotgrid)",
      },
      borderWidth: {
        edge: "var(--card-edge-width)", /* border-t-edge + border-t-edge-teal etc. */
        chip: "1.5px",
      },
      transitionTimingFunction: {
        e911: "cubic-bezier(0.2, 0.8, 0.3, 1)",
      },
      transitionDuration: {
        fast: "110ms",
        DEFAULT: "170ms",
        /* duration-slow — for movement that changes SIZE or POSITION (the rail
           opening, a Dialog entering), not for a colour change. Added 1.7.0. */
        slow: "240ms",
      },
    },
  },
};
