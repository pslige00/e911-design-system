import { defineConfig } from "vitest/config";

/**
 * The unit half of this package's release gate. `npm test` typechecked and
 * measured contrast and rendered NOTHING, which is why four of the eleven tags
 * before this one fixed a defect a browser found after release: a card at the
 * wrong heading rung, a drawer whose labels were invisible, a live region that
 * announced nothing, a rail unreachable below the fold. Every one of those is a
 * rendering fact, and `tsc` cannot reach a rendering fact.
 *
 * WHAT THIS CONFIG DELIBERATELY DOES NOT COVER. jsdom has no layout engine:
 * `getBoundingClientRect()` is all zeros, `getClientRects()` is empty for every
 * element, `scrollWidth`/`clientWidth` are 0, no stylesheet is applied and no
 * media query is evaluated. So nothing here can see a focus ring clipped by an
 * `overflow-hidden` card, a 44px target that came out 29px, a `max-md:` rule, a
 * contrast pair, or a tab that scrolled out of its strip. Those belong to the
 * Playwright scripts that drive a real server, and each test file says so where
 * it stops. A test that cannot fail is worse than no test.
 *
 * Tests live in `test/`, NOT beside the source, for two reasons that are both
 * load-bearing: `package.json#files` publishes `src` wholesale, so a
 * `src/*.test.tsx` would ship inside the tarball every consuming app installs;
 * and `tsconfig.json#include` is `["src"]`, so a test file there would be
 * typechecked against a tsconfig that has never heard of vitest's globals and
 * `npm test` would fail on the test suite's own imports.
 */
export default defineConfig({
  // NO `esbuild.jsx` HERE, deliberately, and not because it is unnecessary:
  // Vitest 4 transforms with oxc, and setting it emits "Both esbuild and oxc
  // options were set. oxc options will be used and esbuild options will be
  // ignored" — a config line that looks load-bearing and does nothing. oxc's
  // default is the automatic runtime, which is what these files rely on (none
  // of them imports React). If a future major flips that default, every test
  // file fails at once with "React is not defined", which reads as a missing
  // import rather than as a build setting — so look here first.
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    setupFiles: ["./test/setup.ts"],
    // Every spy in this suite is created inside a test; without this a
    // console.error spy from one file's "this logs a defect" assertion stays
    // installed and swallows React's own warnings in the next.
    restoreMocks: true,
    // The stubs in test/setup.ts are plain `vi.fn()`s installed ONCE on
    // Element.prototype, not per-test spies, so `restoreMocks` above does not
    // reach them. Without this their call history accumulates across a whole
    // file and `expect(scrollIntoView).toHaveBeenCalled()` passes on a call some
    // earlier test made — a green assertion about an event that never happened.
    clearMocks: true,
  },
});
