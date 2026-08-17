import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { DataTable, DomainCard, FormField, KpiCard } from "../src/index";
import { fireResizeObservers } from "./setup";

/**
 * data.tsx — DomainCard, KpiCard, DataTable, FormField.
 *
 * LEFT TO PLAYWRIGHT: the 4px domain edge as PAINTED (the class is asserted
 * here; that the rule reaches the element and resolves to --edge-orange is a
 * cascade fact, and the one time this broke in the field the only instrument
 * that caught it was comparing computed styles in a browser); the focus ring
 * clipped by `overflow-hidden` on a flush card; the scroll region's real
 * overflow at 320px; and every column width.
 */

/* ------------------------------------------------------------- DomainCard */
describe("DomainCard", () => {
  it("renders its title at rung 2 by default", () => {
    // 1.10.0, and the whole point of the change: a Ribbon renders the page's h1,
    // so a card directly under it is the second rung. The old default of 3 put
    // 17 of 21 routes in one consuming app on an h1 -> h3 skip with no h2, and
    // one route had eleven h3s and one flat rung, so "jump by section" did
    // nothing.
    render(<DomainCard edge="orange" title="Coverage">body</DomainCard>);
    expect(screen.getByRole("heading", { level: 2, name: "Coverage" })).toBeTruthy();
  });

  it("takes a lower rung when the page nests one card inside another", () => {
    render(<DomainCard edge="teal" title="By position" titleLevel={4}>body</DomainCard>);
    expect(screen.getByRole("heading", { level: 4, name: "By position" })).toBeTruthy();
  });

  it("names its own landmark from the title", () => {
    // A <section> with no accessible name is not a landmark at all — it is a
    // plain grouping a screen reader never offers as a destination, which on a
    // route carrying five stacked table cards means no way to move between them.
    render(<DomainCard edge="orange" title="Exception queue">body</DomainCard>);
    expect(screen.getByRole("region", { name: "Exception queue" })).toBeTruthy();
  });

  it("lets an app-supplied name win", () => {
    render(
      <DomainCard edge="orange" title="Open" aria-label="Open trades">
        body
      </DomainCard>
    );
    expect(screen.getByRole("region", { name: "Open trades" })).toBeTruthy();
  });

  it("stays anonymous with no title", () => {
    // What keeps a six-tile KPI strip from putting six landmarks in the rotor
    // between the page header and the first table.
    render(<DomainCard edge="orange">body</DomainCard>);
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("keys the top edge off the domain hue", () => {
    const { container } = render(<DomainCard edge="teal">body</DomainCard>);
    const section = container.querySelector("section") as HTMLElement;
    expect(section.className).toContain("border-t-edge-teal");
    // `relative` is not layout here: without it an `.sr-only` descendant (which
    // is position:absolute) resolves against the initial containing block,
    // escapes the card's clip and widens the DOCUMENT. Measured on one
    // consumer's /admin at 390px: 170 escaped nodes and scrollWidth 446.
    expect(section.className).toContain("relative");
  });

  it("signals a flush card so its children draw focus inward", () => {
    // Not a style — a signal to tokens.css. The global indicator reaches ~7px
    // outside a control's border box and `overflow-hidden` removes all of it on
    // an edge a control sits flush against, with nothing to see and no error.
    const { container, rerender } = render(<DomainCard edge="orange" flush>t</DomainCard>);
    expect((container.querySelector("section") as HTMLElement).className).toContain(
      "e911-card-flush"
    );
    rerender(<DomainCard edge="orange">t</DomainCard>);
    expect((container.querySelector("section") as HTMLElement).className).not.toContain(
      "e911-card-flush"
    );
  });
});

/* ---------------------------------------------------------------- KpiCard */
describe("KpiCard", () => {
  it("renders the label immediately before the numeral", () => {
    // The label/value association here is DOM order, not a landmark and not a
    // label element — see the note on the component.
    const { container } = render(<KpiCard edge="orange" label="On duty" value="27" />);
    expect(container.textContent).toContain("On duty");
    expect(container.textContent).toContain("27");
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("keeps the numeral tabular", () => {
    // A KPI strip is a glance surface; proportional digits make four cards in a
    // row disagree about where the numbers start.
    const { container } = render(<KpiCard edge="orange" label="On duty" value="27" />);
    const value = container.querySelector("b") as HTMLElement;
    expect(value.className).toContain("tabular-nums");
  });

  it("tones the delta pill by direction", () => {
    const { container } = render(
      <KpiCard edge="orange" label="On duty" value="27" delta={{ text: "−2", direction: "down" }} sub="vs yesterday" />
    );
    expect(container.textContent).toContain("−2");
    expect(container.textContent).toContain("vs yesterday");
    expect(container.innerHTML).toContain("bg-bad-soft");
  });
});

/* -------------------------------------------------------------- DataTable */
interface Row {
  id: string;
  name: string;
  hours: string;
}

const rows: Row[] = [
  { id: "1", name: "M. Alvarez", hours: "12.00" },
  { id: "2", name: "C. Huskey", hours: "8.50" },
];

const columns = [
  { key: "name", header: "Name", cell: (r: Row) => r.name },
  { key: "hours", header: "Hours", align: "right" as const, cell: (r: Row) => r.hours },
];

describe("DataTable", () => {
  it("emits a real table with column headers", () => {
    // The system owns this markup so no consumer has to hand-roll it — which is
    // also why `scope="col"` is stated rather than left to the browser's
    // inference: an app cannot add it without rebuilding the table.
    render(<DataTable columns={columns} rows={rows} rowKey={(r) => r.id} aria-label="Timecard" />);
    const table = screen.getByRole("table", { name: "Timecard" });
    expect(table.tagName).toBe("TABLE");
    const headers = screen.getAllByRole("columnheader");
    expect(headers.map((h) => h.textContent)).toEqual(["Name", "Hours"]);
    for (const header of headers) expect(header.getAttribute("scope")).toBe("col");
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2
  });

  it("says something when there are no rows", () => {
    // 1.7.0. Before the default, the guard was `rows.length === 0 && empty`, so
    // a table that shipped without the prop rendered a header row over a void —
    // which reads as "still loading" or "the app is broken", never as "there is
    // nothing here". Every consuming screen that forgot the prop had that bug
    // and none of them looked wrong in review.
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("No rows to show.")).toBeTruthy();
  });

  it("lets loading outrank the empty state", () => {
    // An empty state may not flash before the data lands: an operator on a slow
    // link read "No exceptions" off a queue that had 40 of them and walked away.
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} loading empty="No exceptions" />);
    expect(screen.queryByText("No exceptions")).toBeNull();
    const table = screen.getByRole("table");
    expect(table.getAttribute("aria-busy")).toBe("true");
    // aria-busy says "in flux" to a reader already on the table; the status says
    // it to one who is not. The skeletons themselves are aria-hidden.
    expect(screen.getByRole("status").textContent).toBe("Loading…");
    // The header renders throughout, so the column strip does not jump.
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
  });

  it("gives a navigating row exactly one link, named for its subject", () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        rowHref={(r) => `/timecard/${r.id}`}
      />
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    // Not "row 12": the accessible name is the thing the row is about.
    expect(links[0]?.textContent).toBe("M. Alvarez");
    expect(links[0]?.getAttribute("href")).toBe("/timecard/1");
    // Found again by class, because an app's renderLink only receives className.
    expect(links[0]?.className).toBe("e911-row-link");
  });

  it("appends the link's purpose AFTER the visible text", () => {
    // WCAG 2.5.3 Label in Name: the name has to START with the visible text, or
    // speech input cannot activate the link by what it says. The ordering here
    // is structural — the purpose is the anchor's last child — so there is no
    // value the callback can return that violates it.
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        rowHref={(r) => `/queue/${r.id}`}
        rowLinkPurpose={() => "— show these 87 in the queue"}
      />
    );
    const link = screen.getAllByRole("link")[0] as HTMLElement;
    expect(link.textContent?.startsWith("M. Alvarez")).toBe(true);
    expect(link.textContent).toContain("show these 87");
  });

  it("refuses to navigate a row the app says is inert", () => {
    // A totals row that shows a pointer cursor and then does nothing is an
    // affordance that lies.
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        rowHref={(r) => `/timecard/${r.id}`}
        rowClickable={(r) => r.id !== "2"}
      />
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("reports a row that claims two links", () => {
    // Two anchors is two tab stops for one destination, and the row's own click
    // delegates to whichever comes first. Always a defect, so it is loud.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <DataTable
        columns={[
          { key: "a", header: "A", cell: (r: Row, ctx) => ctx.rowLink(r.name) },
          { key: "b", header: "B", cell: (r: Row, ctx) => ctx.rowLink(r.hours) },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
        rowHref={(r) => `/x/${r.id}`}
      />
    );
    expect(spy).toHaveBeenCalled();
    expect(String(spy.mock.calls[0]?.[0])).toContain("rowLink was called more than once");
  });

  it("is the identity function outside a navigating row", () => {
    // So a totals row rendered by the same `cell` gets plain content rather than
    // a link to nowhere.
    render(
      <DataTable
        columns={[{ key: "a", header: "A", cell: (r: Row, ctx) => ctx.rowLink(r.name) }]}
        rows={rows}
        rowKey={(r) => r.id}
      />
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("is not a tab stop or a landmark while nothing overflows", () => {
    // 1.10.0. Both were unconditional, and at desktop widths a DataTable almost
    // never overflows: three of one live board's seventeen tab stops were scroll
    // boxes with nothing to scroll, every table was a second near-duplicate
    // landmark inside its own card, and on one route the two names matched
    // exactly and axe raised `landmark-unique`.
    //
    // jsdom reports scrollWidth === clientWidth === 0 for everything, so "does
    // not overflow" is true here for a reason that is not the component's. What
    // this still catches, and the reason it earns its place, is a revert to the
    // unconditional version: that would put role="region" and tabIndex=0 on the
    // box regardless of any measurement, and this assertion would fail.
    const { container } = render(
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} aria-label="Timecard" />
    );
    const box = container.querySelector("div.overflow-x-auto") as HTMLElement;
    expect(box.getAttribute("role")).toBeNull();
    // -1 rather than no attribute at all: a window widened while focus sits on
    // this box would otherwise drop focus to <body>.
    expect(box.getAttribute("tabindex")).toBe("-1");
    expect(box.getAttribute("aria-label")).toBeNull();
  });

  it("becomes a named tab stop once it does overflow", () => {
    // The component's own comparison runs for real here — `scrollWidth >
    // clientWidth` against properties defined on the actual node — and the
    // observer that re-runs it is fired by hand. The fiction is the layout
    // engine, not the logic: content a keyboard user must reach inside a
    // container only a pointer can pan is WCAG 2.1.1.
    const { container } = render(
      <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} aria-label="Timecard" />
    );
    const box = container.querySelector("div.overflow-x-auto") as HTMLElement;
    Object.defineProperty(box, "scrollWidth", { value: 900, configurable: true });
    Object.defineProperty(box, "clientWidth", { value: 320, configurable: true });
    act(() => fireResizeObservers());
    expect(box.getAttribute("role")).toBe("region");
    expect(box.getAttribute("tabindex")).toBe("0");
    // Naming it duplicates the table's own name by design — an anonymous tab
    // stop is worse than a repeated word, and role="region" with no name is not
    // exposed as a landmark at all.
    expect(box.getAttribute("aria-label")).toBe("Timecard");
  });
});

/* -------------------------------------------------------------- FormField */
describe("FormField", () => {
  const field = (props: Partial<Parameters<typeof FormField>[0]> = {}) => (
    <FormField id="hours" label="Hours in total" {...props}>
      {(p) => <input {...p} />}
    </FormField>
  );

  it("associates the label with the control", () => {
    render(field());
    expect(screen.getByLabelText("Hours in total").id).toBe("hours");
  });

  it("describes the control from the hint", () => {
    render(field({ hint: "Rounded to the quarter hour." }));
    const input = screen.getByLabelText("Hours in total");
    expect(input.getAttribute("aria-describedby")).toBe("hours-hint");
    expect(document.getElementById("hours-hint")?.textContent).toBe("Rounded to the quarter hour.");
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("lets the error replace the hint and mark the control invalid", () => {
    render(field({ hint: "Rounded to the quarter hour.", error: "Those do not match." }));
    const input = screen.getByLabelText("Hours in total");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe("hours-error");
    expect(screen.queryByText("Rounded to the quarter hour.")).toBeNull();
  });

  it("mounts a live region that is EMPTY at first render", () => {
    // 1.10.0, WCAG 4.1.3. A description is spoken when you ENTER a field, so an
    // operator who types a wrong confirmation and tabs on hears nothing while
    // the sighted operator watches red appear. A live region that appears at the
    // same instant it gains its text is not reliably announced either — so it
    // has to be here, and empty, before there is any news.
    const { container } = render(field());
    const live = container.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(live).not.toBeNull();
    expect(live.getAttribute("role")).toBe("status");
    expect(live.textContent).toBe("");
  });

  it("says nothing on mount for a form that arrives already invalid", () => {
    // Five server-rendered errors are the state of the page, not news;
    // aria-describedby covers them.
    const { container } = render(field({ error: "Those do not match." }));
    expect((container.querySelector('[aria-live="polite"]') as HTMLElement).textContent).toBe("");
  });

  it("announces the label with the error when one arrives", () => {
    // The label rides along because a polite region is heard out of context:
    // "Those do not match." on a form of five controls does not say which one,
    // and the reader has by then tabbed away from it.
    const { container, rerender } = render(field());
    rerender(field({ error: "Those do not match." }));
    expect((container.querySelector('[aria-live="polite"]') as HTMLElement).textContent).toBe(
      "Hours in total: Those do not match."
    );
  });

  it("says 'required' in a word, in the label", () => {
    // 1.10.0, WCAG 3.3.2. Not an asterisk and not a colour: a bare `*` is
    // unpronounced by some AT and meaningless to anyone not told the convention.
    // The space is a real character — name computation is not required to insert
    // one at an element boundary, so a margin would announce
    // "Hours in total(required)".
    render(field({ required: true }));
    const input = screen.getByLabelText("Hours in total (required)") as HTMLInputElement;
    // All three channels, because the trigger of a Select is a <button> and
    // DateField's is a composite, where native `required` means nothing.
    expect(input.required).toBe(true);
    expect(input.getAttribute("aria-required")).toBe("true");
  });

  it("hands the control a height and a stroke, and no focus treatment", () => {
    // The removed half travelled OUT of this package: this string is spread onto
    // whatever control an app renders, so an outline-suppressing utility here
    // landed on every consumer's own inputs. It was inert only because the
    // system's indicator rule is unlayered — layer it and every FormField
    // control in every E911 app loses its keyboard focus ring at once.
    render(field());
    const className = screen.getByLabelText("Hours in total").className;
    expect(className).toContain("border-line-control");
    expect(className).not.toContain("outline-none");
    expect(className).not.toContain("focus:");
  });

  it("does not pass `size` down to the control", () => {
    // `size` on an <input> is a real HTML attribute meaning "width in
    // characters", so forwarding it would silently resize every native field.
    render(field({ size: "tap" }));
    const input = screen.getByLabelText("Hours in total");
    expect(input.getAttribute("size")).toBeNull();
    expect(input.className).toContain("h-tap");
  });
});
