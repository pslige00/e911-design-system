import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AppShell, RailAction, Ribbon, RibbonButton, SkipLink } from "../src/index";
import { setViewportWide } from "./setup";

/**
 * shell.tsx — AppShell, RailAction, Ribbon, RibbonButton, SkipLink.
 *
 * LEFT TO PLAYWRIGHT, and it is nearly everything this file's own history is
 * about, because the rail's failures have all been geometric:
 *  · 1.8.2, the rail as tall as <main> (measured nav rect 5156px on /now, with
 *    sign-out 4516px below the fold) and the destinations/footer split that
 *    fixed it. Sticky, `h-dvh` and `align-self` are layout.
 *  · the closed drawer's eleven off-canvas tab stops, which `max-md:invisible`
 *    removes in CSS. jsdom applies no stylesheet and evaluates no media query,
 *    so the drawer here is neither hidden nor off-canvas; the `inert` half is
 *    React state and IS visible below, but the CSS half is not.
 *  · the hover-to-peek timers, the 64px -> 224px width transition, and that the
 *    grid track follows `pinned` and never `open` (the whole no-reflow-on-hover
 *    contract).
 *
 * `window.matchMedia` is stubbed WIDE in test/setup.ts, so this is the
 * desk-machine shell. What is settled here is the structure and the state
 * machine: tab order, landmarks, `aria-current`, the pin's `aria-pressed`, and
 * the one label bug that shipped because a class could never beat an inline
 * style.
 */

const items = [
  { id: "now", label: "Now", icon: <svg />, href: "/now" },
  { id: "schedule", label: "Schedule", icon: <svg />, href: "/schedule" },
];

function shell(props: Record<string, unknown> = {}) {
  return render(
    <AppShell items={items} activeId="now" {...props}>
      <p>page body</p>
    </AppShell>
  );
}

describe("AppShell", () => {
  it("puts the skip link first in the DOM, and therefore first in tab order", () => {
    // The only thing that makes a skip link work. It lives here rather than in
    // each app because the rail puts its pin control first INSIDE the rail, so
    // an app-level link would have to be rendered before <AppShell> to precede
    // it — the shell owns that boundary.
    const { container } = shell();
    const link = screen.getByRole("link", { name: "Skip to main content" });
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(container.firstElementChild?.firstElementChild).toBe(link);
    expect(link.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(link.getAttribute("href")).toBe("#main-content");
  });

  it("gives <main> the id the skip link jumps to, and a way to receive focus", () => {
    // Without tabIndex the browser scrolls to the anchor and leaves focus on the
    // link, so the next Tab drops the operator straight back into the rail —
    // the failure that makes people believe skip links do nothing.
    shell();
    const main = screen.getByRole("main");
    expect(main.id).toBe("main-content");
    expect(main.getAttribute("tabindex")).toBe("-1");
    expect(screen.getByText("page body")).toBeTruthy();
  });

  it("takes an app's own main id", () => {
    shell({ mainId: "content" });
    expect(screen.getByRole("main").id).toBe("content");
    expect(screen.getByRole("link", { name: "Skip to main content" }).getAttribute("href")).toBe(
      "#content"
    );
  });

  it("lets an app that renders its own skip link opt out", () => {
    // Two skip links is a worse first tab stop than one.
    shell({ skipLink: false });
    expect(screen.queryByRole("link", { name: "Skip to main content" })).toBeNull();
  });

  it("renders destinations as real links and marks the active one", () => {
    // The rail is the app's primary nav, so these must be links: a <button>
    // breaks middle-click, copy-link and prefetch, and makes every destination
    // invisible to the router.
    shell();
    const now = screen.getByRole("link", { name: "Now" });
    expect(now.getAttribute("href")).toBe("/now");
    expect(now.getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Schedule" }).getAttribute("aria-current")).toBeNull();
  });

  it("hands an app's router the whole row", () => {
    const renderLink = vi.fn(({ href, className, children, ...rest }) => (
      <a data-router href={href} className={className} {...rest}>
        {children}
      </a>
    ));
    shell({ renderLink });
    expect(renderLink).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("link", { name: "Now" }).hasAttribute("data-router")).toBe(true);
    // The renderer receives the accessible name and the current-page state, not
    // just an href — an app cannot compute either of them.
    expect(renderLink.mock.calls[0]?.[0]).toMatchObject({
      href: "/now",
      "aria-label": "Now",
      "aria-current": "page",
    });
  });

  it("falls back to onNavigate for an item with no href", () => {
    const onNavigate = vi.fn();
    render(
      <AppShell
        items={[{ id: "settings", label: "Settings", icon: <svg /> }]}
        activeId="settings"
        onNavigate={onNavigate}
      >
        body
      </AppShell>
    );
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(onNavigate).toHaveBeenCalledWith("settings");
  });

  it("carries the pin's state in aria-pressed, with one constant label", () => {
    // Flipping the label to "Unpin" as well announces the state twice and
    // inverts it for anyone who hears only one of the two.
    const onRailPinnedChange = vi.fn();
    shell({ onRailPinnedChange });
    const pin = screen.getByRole("button", { name: "Pin navigation" });
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(pin.getAttribute("aria-pressed")).toBe("false");
    expect(nav.getAttribute("data-pinned")).toBe("false");
    fireEvent.click(pin);
    expect(pin.getAttribute("aria-pressed")).toBe("true");
    expect(nav.getAttribute("data-pinned")).toBe("true");
    expect(onRailPinnedChange).toHaveBeenCalledWith(true);
  });

  it("does not write its own pin state while the app controls it", () => {
    // Writing local state while a controlled value is present lets the two
    // disagree the moment the app declines the change.
    const onRailPinnedChange = vi.fn();
    shell({ railPinned: false, onRailPinnedChange });
    fireEvent.click(screen.getByRole("button", { name: "Pin navigation" }));
    expect(onRailPinnedChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button", { name: "Pin navigation" }).getAttribute("aria-pressed")).toBe(
      "false"
    );
  });

  it("keeps the rail's labels transparent until something opens it", () => {
    // --rail-label-opacity is set INLINE, from `open`. That is the mechanism
    // behind the 1.9.1 bug below, and it is asserted here so the two halves are
    // pinned together: an inline style beats any class on the same property, in
    // any media query.
    shell();
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav.style.getPropertyValue("--rail-label-opacity")).toBe("0");
    expect(nav.getAttribute("data-expanded")).toBe("false");
  });

  it("closes a drawer opened below md on the way back up past it", () => {
    // The reverse of the four assertions below, and the reason they need a
    // narrow viewport at all: above `md` the rail is a normal column and the
    // drawer must not exist. Leave this out and a drawer opened at 700px keeps
    // <main> inert after the viewport grows — the whole page unfocusable and
    // invisible to a screen reader, nothing on screen explaining why, and no
    // control left to undo it. A tablet rotating from portrait to landscape is
    // exactly this, and 768px is the width a portrait tablet sits at.
    shell();
    fireEvent.click(screen.getByRole("button", { name: "Navigation" }));
    expect(screen.getByRole("button", { name: "Navigation" }).getAttribute("aria-expanded")).toBe(
      "false"
    );
    expect(screen.getByRole("main").hasAttribute("inert")).toBe(false);
  });

  it("takes the closed drawer out of the tab order below md", () => {
    // 1.10.1, and it was a blocker: the closed panel is moved out of view by a
    // transform, and a transform never removes anything from the focus order —
    // Chromium kept all eleven controls sequentially focusable at x=-214, so a
    // keyboard operator Tabbed eleven times with no visible focus anywhere and
    // stop [12] was Sign out. Not a phone bug either: 200% zoom on a 1280px desk
    // machine puts the layout viewport at 640px.
    //
    // This is the React-state half (`inert`). The CSS half — `max-md:invisible`,
    // which is what covers the seconds before hydration and the case of JS never
    // arriving — is a media query and belongs to the browser harness.
    setViewportWide(false);
    shell();
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(nav.hasAttribute("inert")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Navigation" }));
    expect(nav.hasAttribute("inert")).toBe(false);
  });

  it("opens the drawer WITH ITS LABELS", () => {
    setViewportWide(false);
    // THE 1.9.1 BUG, and the one this file exists for. 1.9.0 shipped the drawer
    // with eight unlabelled icons: the opacity was set inline from `open`, which
    // did not include `drawerOpen`, and the `max-md:` class written to force it
    // back to 1 could never win against an inline style. Folding drawerOpen into
    // `open` fixes it at the source — so with the drawer open the rail genuinely
    // IS expanded, and data-expanded, the width and the labels all say so.
    shell();
    const nav = screen.getByRole("navigation", { name: "Primary" });
    const menu = screen.getByRole("button", { name: "Navigation" });
    expect(menu.getAttribute("aria-expanded")).toBe("false");
    expect(menu.getAttribute("aria-controls")).toBe(nav.id);
    fireEvent.click(menu);
    expect(menu.getAttribute("aria-expanded")).toBe("true");
    expect(nav.getAttribute("data-expanded")).toBe("true");
    expect(nav.style.getPropertyValue("--rail-label-opacity")).toBe("1");
    // And the labels are really in the rail, not only in the aria-label.
    expect(screen.getByRole("link", { name: "Now" }).textContent).toBe("Now");
  });

  it("makes the page behind the open drawer inert", () => {
    // `inert` removes the subtree from the tab order AND the accessibility tree
    // in one attribute, which is what makes the drawer modal without hand-rolling
    // a focus trap. Undefined rather than false: React renders `inert=""` for any
    // truthy value and older runtimes stringify `false` into a live attribute.
    setViewportWide(false);
    shell();
    const main = screen.getByRole("main");
    expect(main.hasAttribute("inert")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Navigation" }));
    expect(main.hasAttribute("inert")).toBe(true);
  });

  it("closes the drawer on Escape and gives focus back to the control that opened it", () => {
    // Losing focus to <body> is how a keyboard operator ends up tabbing the page
    // behind.
    setViewportWide(false);
    shell();
    const menu = screen.getByRole("button", { name: "Navigation" });
    fireEvent.click(menu);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(menu.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(menu);
  });

  it("closes the drawer when a destination is tapped", () => {
    // A drawer still covering the page it just navigated to is what makes people
    // think the tap failed. Delegated on the nav, because the row may be an
    // app-supplied <Link> and this must not depend on which.
    //
    // Rendered through `renderLink` so the row is a router-style anchor rather
    // than the fallback one — which is the case the delegation exists for — and
    // so the click can be stopped from actually navigating: jsdom answers a real
    // <a href> click with "Not implemented: navigation to another Document" on
    // stderr, and a suite that prints errors on a green run teaches people to
    // stop reading its output.
    setViewportWide(false);
    shell({
      renderLink: ({ href, className, children, ...rest }: Record<string, unknown>) => (
        <a
          href={href as string}
          className={className as string}
          onClick={(e) => e.preventDefault()}
          {...rest}
        >
          {children as React.ReactNode}
        </a>
      ),
    });
    fireEvent.click(screen.getByRole("button", { name: "Navigation" }));
    fireEvent.click(screen.getByRole("link", { name: "Schedule" }));
    expect(screen.getByRole("button", { name: "Navigation" }).getAttribute("aria-expanded")).toBe(
      "false"
    );
  });

  it("locks the page under the open drawer, on documentElement", () => {
    // NOT body: dialog.tsx locks body behind a module-level count that is not
    // exported, and a second independent count would cross the two saved values
    // — a Dialog opened on a drawer-navigated page would unlock the page beneath
    // itself. Two different properties compose without sharing anything.
    setViewportWide(false);
    shell();
    expect(document.documentElement.style.overflow).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Navigation" }));
    expect(document.documentElement.style.overflow).toBe("hidden");
    expect(document.body.style.overflow).toBe("");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("renders footer destinations and the session action apart from them", () => {
    shell({
      footerItems: [{ id: "admin", label: "Admin", icon: <svg />, href: "/admin" }],
      railFooter: <RailAction icon={<svg />} label="Dark mode" />,
      railSessionAction: <RailAction icon={<svg />} label="Sign out" />,
    });
    const admin = screen.getByRole("link", { name: "Admin" });
    const theme = screen.getByRole("button", { name: "Dark mode" });
    const signOut = screen.getByRole("button", { name: "Sign out" });
    // The order is the contract: destinations, preferences, then the exit,
    // behind a divider. Measured before that divider existed: sign-out sat 6px
    // below the theme toggle — the control a dispatcher reaches for in a dark
    // room — and one finger-width of tremor ended the shift's session.
    expect(admin.compareDocumentPosition(theme) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(theme.compareDocumentPosition(signOut) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("RailAction", () => {
  it("is a button named by its label, which is also visible", () => {
    render(<RailAction icon={<svg />} label="Dark mode" />);
    const button = screen.getByRole("button", { name: "Dark mode" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.textContent).toBe("Dark mode");
  });

  it("shares one row class with every rail destination", () => {
    // The three row kinds — destinations, footer destinations and this — cannot
    // be allowed to drift; before RailAction was exported, apps re-implemented
    // the row and it went stale the first time the rail changed.
    render(<RailAction icon={<svg />} label="Dark mode" active />);
    const className = screen.getByRole("button").className;
    expect(className).toContain("h-tap");
    expect(className).toContain("min-w-tap");
    expect(className).toContain("bg-brand-soft");
  });
});

describe("Ribbon", () => {
  it("owns the page's h1", () => {
    // One per page, always the page header — which is what makes DomainCard's
    // default rung of 2 correct.
    render(<Ribbon eyebrow="Operations" title="Live board" subtitle="Updated a moment ago" />);
    expect(screen.getByRole("heading", { level: 1, name: "Live board" })).toBeTruthy();
    expect(screen.getByText("Operations")).toBeTruthy();
    expect(screen.getByText("Updated a moment ago")).toBeTruthy();
  });

  it("keeps the class that re-points the focus ring", () => {
    // `e911-ribbon` is not decoration: tokens.css uses it to re-point
    // --focus-ring for everything inside, because the brand orange ring is
    // 1.25:1 on this gradient. Drop the class and every control in the ribbon
    // loses its focus indicator, silently.
    const { container } = render(<Ribbon title="Live board" />);
    const header = container.querySelector("header") as HTMLElement;
    expect(header.className).toContain("e911-ribbon");
  });

  it("states the eyebrow's own tracking", () => {
    // --text-micro is shared with the DataTable column header, whose tracking is
    // 0.06em against this one's 0.1em, so the token declares none and both call
    // sites state their own. Delete either as duplication and a letterform
    // changes silently — nothing type-checks it and no contrast audit sees it.
    const { container } = render(<Ribbon eyebrow="Operations" title="Live board" />);
    const eyebrow = screen.getByText("Operations");
    expect(eyebrow.className).toContain("tracking-[0.1em]");
    expect(container.querySelector("h1")?.className).toContain("text-ribbon-h1");
  });

  it("renders actions in their own scrim", () => {
    // The scrim is the slot's, not the button's: anything right-aligned on this
    // gradient lands in the gold terminus, measured 3.06:1 at 1920px.
    render(<Ribbon title="Live board" actions={<RibbonButton>Export</RibbonButton>} />);
    const button = screen.getByRole("button", { name: "Export" });
    expect((button.parentElement as HTMLElement).className).toContain("ribbon-actions-scrim");
  });
});

describe("RibbonButton", () => {
  it("defaults to a non-submitting button and pairs its pill with its label", () => {
    // `bg-white text-brand-text` measured 2.01:1 in dark — the worst ratio in the
    // system — because --text-brand flips to a light orange and the pill stayed
    // white. Whatever repaints the pill must repaint the label with it.
    render(<RibbonButton>Export</RibbonButton>);
    const className = screen.getByRole("button", { name: "Export" }).className;
    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
    expect(className).toContain("--ribbon-action-surface");
    expect(className).toContain("--ribbon-action-text");
    expect(className).not.toContain("bg-white");
  });

  it("takes the control scale like every other button", () => {
    // It drew 33px until 1.8.0 — one pixel taller than --control-height and one
    // off the 4px grid — because it was drawn by eye beside a system that had
    // already named the number.
    render(<RibbonButton variant="ghost">Filter</RibbonButton>);
    expect(screen.getByRole("button").className).toContain("h-ctl");
  });
});

describe("SkipLink", () => {
  it("is invisible until it is focused", () => {
    // The one control in the system that is; `focus:not-sr-only` is the whole
    // mechanism, and z-popover is what puts it over the rail it bypasses.
    render(<SkipLink targetId="main-content" />);
    const link = screen.getByRole("link", { name: "Skip to main content" });
    expect(link.className).toContain("sr-only");
    expect(link.className).toContain("focus:not-sr-only");
    expect(link.className).toContain("focus:z-popover");
  });
});
