import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { OWNERSHIP_ROUTES, stubApi } from "../../test/fakeApi";
import ClassesPage from "./ClassesPage";

afterEach(() => vi.unstubAllGlobals());

const srd = { key: "srd-2014", displayName: "5e 2014 Rules", name: "System Reference Document 5.1", publisher: { name: "Wizards of the Coast" }, gamesystem: { name: "5th Edition 2014" } };

const gained = (...levels) => levels.map((level) => ({ level, detail: null }));
const column = (...pairs) => pairs.map(([level, columnValue]) => ({ level, columnValue }));

const wizard = {
  key: "srd_wizard",
  name: "Wizard",
  document: srd,
  subclassOf: null,
  desc: "",
  hitDice: "D6",
  casterType: "FULL",
  savingThrows: [{ name: "Intelligence" }, { name: "Wisdom" }],
  primaryAbilities: [{ name: "Intelligence" }],
  hitPoints: { hitDice: "D6", hitPointsAt1stLevel: "6 + your Constitution modifier", hitPointsAtHigherLevels: "1d6 (or 4) + your Constitution modifier per wizard level after 1st" },
  features: [
    { key: "w-pb", name: "Proficiency Bonus", featureType: "PROFICIENCY_BONUS", gainedAt: [], dataForClassTable: column([1, "+2"], [2, "+2"], [3, "+2"], [4, "+2"]) },
    { key: "w-cantrips", name: "Cantrips Known", featureType: "CLASS_TABLE_DATA", gainedAt: [], dataForClassTable: column([1, "3"], [4, "4"]) },
    { key: "w-slots-1st", name: "1st", featureType: "SPELL_SLOTS", gainedAt: [], dataForClassTable: column([1, "2"], [2, "3"], [3, "4"], [4, "4"]) },
    { key: "w-slots-2nd", name: "2nd", featureType: "SPELL_SLOTS", gainedAt: [], dataForClassTable: column([3, "2"], [4, "3"]) },
    { key: "w-profs", name: "Proficiencies", featureType: "PROFICIENCIES", desc: "**Armor:** None", gainedAt: [] },
    { key: "w-equipment", name: "Equipment", featureType: "STARTING_EQUIPMENT", desc: "You start with a quarterstaff.", gainedAt: [] },
    { key: "w-recovery", name: "Arcane Recovery", featureType: "CLASS_LEVEL_FEATURE", desc: "You can recover some spell slots.", gainedAt: gained(1) },
    { key: "w-tradition", name: "Arcane Tradition", featureType: "CLASS_LEVEL_FEATURE", desc: "You choose a school of magic.", gainedAt: gained(2) },
    { key: "w-asi", name: "Ability Score Improvement", featureType: "CLASS_LEVEL_FEATURE", desc: "Raise your scores.", gainedAt: gained(8, 4) },
  ],
};
const evocation = {
  key: "srd_school-of-evocation",
  name: "School of Evocation",
  document: srd,
  subclassOf: { key: "srd_wizard", name: "Wizard" },
  desc: "",
  hitDice: null,
  casterType: null,
  savingThrows: [],
  primaryAbilities: [],
  hitPoints: null,
  features: [
    { key: "e-savant", name: "Evocation Savant", featureType: "CLASS_LEVEL_FEATURE", desc: "Copying evocation spells costs half.", gainedAt: gained(2) },
    { key: "e-empowered", name: "Empowered Evocation", featureType: "CLASS_LEVEL_FEATURE", desc: "Add your Intelligence modifier to damage.", gainedAt: gained(10) },
  ],
};
const fighter = {
  key: "srd_fighter",
  name: "Fighter",
  document: srd,
  subclassOf: null,
  desc: "",
  hitDice: "D10",
  casterType: "NONE",
  savingThrows: [{ name: "Strength" }, { name: "Constitution" }],
  primaryAbilities: [],
  hitPoints: null,
  features: [
    { key: "f-wind", name: "Second Wind", featureType: "CLASS_LEVEL_FEATURE", desc: "You regain hit points.", gainedAt: gained(1) },
    { key: "f-surge", name: "Action Surge", featureType: "CLASS_LEVEL_FEATURE", desc: "Take one additional action.", gainedAt: gained(2) },
  ],
};
const all = [wizard, evocation, fighter];

/** A backend whose class list answers a search the way the real one does: by name, subclass and subclassOf. */
function stubBackend(extra = {}) {
  const base = stubApi({ ...OWNERSHIP_ROUTES, ...extra });
  const fetchMock = vi.fn(async (url, init = {}) => {
    const address = new URL(url, "http://backend");
    if ((init.method ?? "GET") === "GET" && address.pathname === "/api/classes") {
      const name = (address.searchParams.get("name") ?? "").toLowerCase();
      const sub = address.searchParams.get("subclass");
      const of = address.searchParams.get("subclassOf");
      const found = all.filter(
        (one) =>
          one.name.toLowerCase().includes(name) &&
          (sub === null || String(Boolean(one.subclassOf)) === sub) &&
          (of === null || one.subclassOf?.key === of),
      );
      return new Response(JSON.stringify({ content: found }), { status: 200 });
    }
    const one = (init.method ?? "GET") === "GET" ? all.find((cls) => `/api/classes/${cls.key}` === address.pathname) : null;
    if (one) {
      return new Response(JSON.stringify(one), { status: 200 });
    }
    return base(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function pick(label, text) {
  const input = screen.getByRole("combobox", { name: label });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  const option = await waitFor(
    () => {
      const found = within(screen.getByRole("listbox")).getAllByRole("option").find((candidate) => candidate.textContent.includes(text));
      expect(found).toBeDefined();
      return found;
    },
    { timeout: 2500 },
  );
  fireEvent.click(option);
}

describe("reading a class", () => {
  it("shows its facts, hit points, proficiencies, equipment and source", async () => {
    stubBackend();
    render(<ClassesPage />);

    expect(screen.getByText("Search for a class or subclass to see its level table and features.")).toBeInTheDocument();
    await pick("Class", "Wizard");

    expect(await screen.findByRole("heading", { name: "Wizard" })).toBeInTheDocument();
    expect(screen.getByText("5e 2014 Rules")).toBeInTheDocument();
    expect(screen.getByText("d6")).toBeInTheDocument();
    expect(screen.getByText("Intelligence, Wisdom")).toBeInTheDocument();
    expect(screen.getByText("Full caster")).toBeInTheDocument();
    expect(screen.getByText("6 + your Constitution modifier")).toBeInTheDocument();
    expect(screen.getByText("None")).toBeInTheDocument(); // the armor proficiencies
    expect(screen.getByText("You start with a quarterstaff.")).toBeInTheDocument();
  });

  it("shows the class table: a row for each level with the features gained and each column", async () => {
    stubBackend();
    render(<ClassesPage />);
    await pick("Class", "Wizard");

    const table = within(await screen.findByRole("table", { name: "Class table" }));
    expect(table.getByRole("columnheader", { name: "Proficiency Bonus" })).toBeInTheDocument();
    expect(table.getByRole("columnheader", { name: "Cantrips Known" })).toBeInTheDocument();
    expect(table.getByRole("columnheader", { name: "Spell slots" })).toHaveAttribute("colspan", "2");
    expect(table.getByRole("columnheader", { name: "1st" })).toBeInTheDocument();
    const rows = table.getAllByRole("row");
    const level1 = within(rows.find((row) => within(row).queryByRole("rowheader", { name: "1" })));
    expect(level1.getByText("Arcane Recovery")).toBeInTheDocument();
    expect(level1.getByText("+2")).toBeInTheDocument();
    const level4 = within(rows.find((row) => within(row).queryByRole("rowheader", { name: "4" })));
    expect(level4.getByText("Ability Score Improvement")).toBeInTheDocument();
    expect(level4.getAllByText("4").length).toBeGreaterThan(0); // cantrips known, and 1st-level slots
  });

  it("lists the features with the levels they are gained at", async () => {
    stubBackend();
    render(<ClassesPage />);
    await pick("Class", "Wizard");

    expect(await screen.findByText("You can recover some spell slots.")).toBeInTheDocument();
    expect(screen.getByText("Levels 4 and 8")).toBeInTheDocument();
    expect(screen.getByText("Raise your scores.")).toBeInTheDocument();
  });

  it("lists its subclasses, and opens one when it is chosen", async () => {
    stubBackend();
    render(<ClassesPage />);
    await pick("Class", "Wizard");

    fireEvent.click(await screen.findByRole("button", { name: "Open School of Evocation" }));

    expect(await screen.findByRole("heading", { name: "School of Evocation" })).toBeInTheDocument();
    expect(screen.getByText("Copying evocation spells costs half.")).toBeInTheDocument();
    expect(screen.getByText("Level 10")).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Class table" })).not.toBeInTheDocument(); // a subclass has no table
  });

  it("says which class a subclass belongs to, and opens it", async () => {
    stubBackend();
    render(<ClassesPage />);
    await pick("Class", "Evocation");

    fireEvent.click(await screen.findByRole("button", { name: "Open Wizard" }));

    expect(await screen.findByRole("heading", { name: "Wizard" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Class table" })).toBeInTheDocument();
  });

  it("says in a result whether it is a class or a subclass, and where it is from", async () => {
    stubBackend();
    render(<ClassesPage />);
    const input = screen.getByRole("combobox", { name: "Class" });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "wiz" } });

    const options = within(await screen.findByRole("listbox", {}, { timeout: 2500 })).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["WizardClass · 5e 2014 Rules"]);
  });

  it("has nothing to make, change or delete: classes are read here", async () => {
    stubBackend();
    render(<ClassesPage />);
    await pick("Class", "Wizard");

    await screen.findByRole("heading", { name: "Wizard" });
    for (const name of ["New class", "Duplicate", "Edit", "Delete"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });
});

describe("narrowing the search", () => {
  it("shows only classes, or only subclasses, when asked", async () => {
    const fetchMock = stubBackend();
    render(<ClassesPage />);

    fireEvent.change(screen.getByLabelText("Show"), { target: { value: "subclasses" } });
    const input = screen.getByRole("combobox", { name: "Class" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "ev" } });
    expect(await screen.findByRole("option", { name: /School of Evocation/ }, { timeout: 2500 })).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url.includes("subclass=true"))).toBe(true);

    fireEvent.change(screen.getByLabelText("Show"), { target: { value: "classes" } });
    fireEvent.change(input, { target: { value: "wiz" } });
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes("subclass=false"))).toBe(true));
  });
});

describe("comparing classes", () => {
  it("lines up their hit die, saves and spellcasting, and what each gains at each level", async () => {
    stubBackend();
    render(<ClassesPage />);
    await pick("Class", "Wizard");
    await screen.findByRole("heading", { name: "Wizard" });

    fireEvent.click(screen.getByRole("button", { name: "Compare" }));
    await pick("Compare with", "Fighter");

    const table = within(await screen.findByRole("table", { name: "Comparison" }));
    expect(table.getByText("d6")).toBeInTheDocument();
    expect(table.getByText("d10")).toBeInTheDocument();
    expect(table.getByText("Strength, Constitution")).toBeInTheDocument();
    expect(table.getByText("Not a spellcaster")).toBeInTheDocument();
    expect(table.getByText("Second Wind")).toBeInTheDocument();
    expect(table.getByText("Arcane Recovery")).toBeInTheDocument();
  });
});
