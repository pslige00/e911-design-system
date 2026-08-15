# e911-design-system — setup for consuming apps

This repo is **not an app**. It is the design system — tokens, components,
and the Claude Code skill — meant to be pulled into other repos. Each E911
app lives in its own repo and depends on this one.

Direction: **Terrazzo × Solstice** · Type: **Grotesk Standard**
(Space Grotesk / Onest / JetBrains Mono) · v1.0.0 · Locked 2026-08-14.

---

## Choose how an app repo consumes this

Three options, ordered by setup cost. Start with option A; graduate to C
only once several apps depend on this and version drift becomes a real
problem — don't build the publishing pipeline before you need it.

### A0. Local link with `file:` (what to use while both repos are on one machine)

The fastest loop during active development, and what `e911-timesweep` uses.
`npm` and `pnpm` both turn a `file:` dependency on a directory into a symlink,
so an edit here shows up in the app on the next reload with no reinstall step.

```jsonc
// app repo's package.json — sibling directories
"dependencies": {
  "@e911/design-system": "file:../e911-design-system"
}
```

**The catch, and it will bite you on deploy day:** `../e911-design-system`
resolves *outside* the Docker build context, so the usual
`COPY package.json package-lock.json ./` + `npm ci` deps stage fails with
`ENOENT`. Two fixes, pick one and write it down:

1. Set the build context to the **parent** directory and copy both repos in —
   `context: ..`, `dockerfile: <app>/Dockerfile`. Keeps one source of truth.
2. Swap to the git-tag dependency (option B) for deploy builds only.

Graduate to B as soon as a second machine or a CI runner needs to build.

### A. Copy-in (zero tooling — good for the next app or two)

No package manager wiring, no auth, no versioning discipline required yet.

```bash
# from the app repo root
mkdir -p vendor
cp -r /path/to/e911-design-system/tokens vendor/e911-tokens
cp -r /path/to/e911-design-system/src    vendor/e911-ui
```

Import locally: `import "../vendor/e911-tokens/tokens.css"`,
`import { Button } from "../vendor/e911-ui"`, and point the Tailwind
preset import at `vendor/e911-tokens/tailwind.preset.js`.

**Trade-off:** updates to the design system don't propagate — you re-copy
by hand. Fine for one or two apps; becomes real toil at four or five.

### B. Git dependency (recommended once you have 2+ app repos)

No publish step, no private registry — `npm`/`pnpm` can install straight
from a GitHub repo and tag. Requires the repo to be reachable (SSH key or
a token if it's private, which it should be).

```bash
# tag a release in e911-design-system once it's pushed to GitHub
git -C /path/to/e911-design-system tag v1.0.0
git -C /path/to/e911-design-system push origin v1.0.0
```

```jsonc
// app repo's package.json
"dependencies": {
  "@e911/design-system": "github:knox-county/e911-design-system#v1.0.0"
}
```

```bash
pnpm install   # or npm install
```

Now the app imports it exactly like a normal package — see "Wiring into
an app" below. **To update:** bump the tag in `e911-design-system`, then
in each app repo change the `#v1.0.0` to the new tag and reinstall. That
one line is your whole upgrade story — deliberately manual, so a token
change never silently ships to five apps at once.

### C. Private npm registry (GitHub Packages) — graduate path

Worth it once this repo is stable and three or more apps depend on it.
Publish via a GitHub Actions workflow on tag push; apps then do a normal
`pnpm add @e911/design-system` with a `.npmrc` pointing at the registry.
Ask me for the publish workflow when you're ready — it's a ~20-line
addition, not a rebuild.

---

## Wiring into an app (same regardless of A/B/C)

**1. Root layout** — import tokens once, load the three fonts:

```tsx
// app/layout.tsx (Next.js) — same idea in any framework
import "@e911/design-system/tokens.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Onest:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**2. Tailwind config** — use the preset, include the package in `content`
so its utility classes aren't purged (path differs slightly by option
A/B/C — for B/C it's inside `node_modules`):

```js
// tailwind.config.mjs — must be .mjs, the preset uses ESM export default
import e911 from "@e911/design-system/tailwind.preset";
export default {
  presets: [e911],
  content: [
    "./src/**/*.{ts,tsx}",
    "./node_modules/@e911/design-system/src/**/*.{ts,tsx}", // option B/C
  ],
};
```

```js
// postcss.config.mjs — also .mjs, same ESM reason
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

**3. Build the page from components, not from scratch:**

```tsx
import { AppShell, Ribbon, RibbonButton, KpiCard, DomainCard, DataTable, DOMAIN_EDGE } from "@e911/design-system";

<AppShell items={NAV} activeId={active} onNavigate={setActive}>
  <Ribbon eyebrow="Certifications" title="Renewal pipeline"
    actions={<RibbonButton>Record training</RibbonButton>} />
  <KpiCard edge={DOMAIN_EDGE.certifications} label="Expiring" value="6" />
</AppShell>
```

---

## Claude Code, per app repo

Copy the skill into every app repo — it's what makes Claude Code build
on-brand there without being told each time:

```bash
mkdir -p .claude/skills/e911-design-system
cp /path/to/e911-design-system/tokens/SKILL.md .claude/skills/e911-design-system/SKILL.md
```

Add a one-line `CLAUDE.md` at that repo's root:

```markdown
# <app name>
UI follows the E911 design system — .claude/skills/e911-design-system/SKILL.md.
Build from @e911/design-system components only; never style locally.
```

---

## Updating the design system itself

Work happens **only in this repo**. Change `tokens/tokens.css` or
`src/*.tsx`, open `tokens/spec.html` in a browser to sanity-check (it
inlines the CSS, no build step needed), commit, tag a new version. Apps
pick up the change on their own schedule by bumping the dependency —
see option B above. Nothing here should ever be edited from inside an
app repo; if an app needs something the system doesn't have, that's a
PR to this repo, not a local override.
