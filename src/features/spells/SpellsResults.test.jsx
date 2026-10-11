import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DAMAGE_TYPES, OWNERSHIP_ROUTES, stubApi } from "../../test/fakeApi";
import SpellsPage from "./SpellsPage";

afterEach(() => vi.unstubAllGlobals());

const srd = { key: "srd-2014", displayName: "5e 2014 Rules", name: "System Reference Document 5.1" };

const spell = (key, name, level, school) => ({
  key,
  name,
  level,
  school: { key: school.toLowerCase(), name: school },
  document: srd,
  castingTime: "action",
  concentration: false,
  ritual: false,
  classes: [{ key: "srd_wizard", name: "Wizard" }],
  castingOptions: [{ type: "default", damageRoll: null }],
  desc: `${name} does something.`,
  rangeUnit: "feet",
  shapeSizeUnit: "feet",
  rangeText: "Self",
  range: 0,
  duration: "instantaneous",
});
const augury = { ...spell("srd_augury", "Augury", 2, "Divination"), ritual: true };
const detect = { ...spell("srd_detect-magic", "Detect Magic", 1, "Divination"), concentration: true };
const fireball = spell("srd_fireball", "Fireball", 3, "Evocation");
const all = [augury, detect, fireball];

/** A backend that lists the spells matching the school and name asked for, the way the real one pages them. */
function stubBackend() {
  const base = stubApi({
    ...OWNERSHIP_ROUTES,
    "GET /api/spellschools": { content: [{ key: "divination", name: "Divination" }, { key: "evocation", name: "Evocation" }] },
    "GET /api/classes": { content: [{ key: "srd_wizard", name: "Wizard" }] },
    "GET /api/damagetypes": DAMAGE_TYPES,
  });
  const searches = [];
  const fetchMock = vi.fn(async (url, init = {}) => {
    const address = new URL(url, "http://backend");
    if ((init.method ?? "GET") === "GET" && address.pathname === "/api/spells") {
      const params = Object.fromEntries(address.searchParams);
      searches.push(params);
      const name = (params.name ?? "").toLowerCase();
      const found = all.filter((one) => one.name.toLowerCase().includes(name) && (!params.school || one.school.key === params.school));
      const sorted = [...found].sort((a, b) => (params.sort?.startsWith("level") ? a.level - b.level : 0));
      if (params.sort === "level,desc") {
        sorted.reverse();
      }
      return new Response(JSON.stringify({ content: sorted, page: { number: Number(params.page ?? 0), size: Number(params.pageSize), totalElements: sorted.length, totalPages: 1 } }), { status: 200 });
    }
    return base(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.searches = searches;
  return fetchMock;
}

const bodyRows = () => within(screen.getByRole("table", { name: "Spell results" })).getAllByRole("row").slice(1);

describe("listing spells as a table", () => {
  it("lists every divination spell when Divination is chosen and Search is pressed, with no name typed", async () => {
    const fetchMock = stubBackend();
    render(<SpellsPage />);
    await screen.findByRole("option", { name: "Divination" });

    fireEvent.change(screen.getByLabelText("School"), { target: { value: "divination" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await screen.findByRole("table", { name: "Spell results" });
    expect(bodyRows().map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual(["Augury", "Detect Magic"]);
    expect(screen.getByText("2 spells found")).toBeInTheDocument();
    const cells = within(bodyRows()[0]).getAllByRole("cell").map((cell) => cell.textContent);
    expect(cells).toEqual(["Augury", "2nd", "Divination", "1 action", "Ritual", "5e 2014 Rules"]);
    expect(fetchMock.searches.at(-1)).toMatchObject({ school: "divination", pageSize: "25", sort: "name,asc" });
  });

  it("sorts by level, and the filters in force are asked for with the sort", async () => {
    const fetchMock = stubBackend();
    render(<SpellsPage />);
    await screen.findByRole("option", { name: "Divination" });
    fireEvent.change(screen.getByLabelText("School"), { target: { value: "divination" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByRole("table", { name: "Spell results" });

    fireEvent.click(screen.getByRole("button", { name: "Level" }));
    fireEvent.click(screen.getByRole("button", { name: "Level" }));

    await waitFor(() => expect(bodyRows().map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual(["Augury", "Detect Magic"]));
    expect(fetchMock.searches.at(-1)).toMatchObject({ school: "divination", sort: "level,desc" });
  });

  it("opens a spell from the table, and goes back to the same results", async () => {
    stubBackend();
    render(<SpellsPage />);
    await screen.findByRole("option", { name: "Divination" });
    fireEvent.change(screen.getByLabelText("School"), { target: { value: "divination" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByRole("table", { name: "Spell results" });

    fireEvent.click(screen.getByRole("button", { name: "Open Detect Magic" }));

    expect(await screen.findByRole("heading", { name: "Detect Magic" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Spell results" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Back to results" }));

    expect(screen.getByRole("table", { name: "Spell results" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Detect Magic" })).not.toBeInTheDocument();
    expect(bodyRows()).toHaveLength(2);
  });

  it("searches the same on a name, with the other filters", async () => {
    const fetchMock = stubBackend();
    render(<SpellsPage />);
    await screen.findByRole("option", { name: "Divination" });

    fireEvent.change(screen.getByLabelText("Name contains"), { target: { value: "fire" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await screen.findByRole("table", { name: "Spell results" });
    expect(bodyRows().map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual(["Fireball"]);
    expect(fetchMock.searches.at(-1).name).toBe("fire");
  });
});
