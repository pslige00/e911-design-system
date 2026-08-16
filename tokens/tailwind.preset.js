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

        line: {
          DEFAULT: "var(--border-default)",
          strong: "var(--border-strong)",
          row: "var(--border-row)",
        },

        ok: { DEFAULT: "var(--status-ok)", soft: "var(--status-ok-soft)" },
        warn: { DEFAULT: "var(--status-warn)", soft: "var(--status-warn-soft)" },
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
      },
      borderRadius: {
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
        row: "var(--row-height)",
        ctl: "var(--control-height)",
        "ctl-sm": "var(--control-height-sm)",
        tap: "var(--tap-target)", /* min-h-tap / size-tap — the touch floor */
      },
      zIndex: {
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
      },
    },
  },
};
