import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { DAMAGE_TYPES, OWNERSHIP_ROUTES, bodiesSentTo, stubApi } from "../../test/fakeApi";
import SpellsPage from "./SpellsPage";

afterEach(() => vi.unstubAllGlobals());

const srd = { key: "srd-2014", displayName: "5e 2014 Rules", name: "System Reference Document 5.1", publisher: { name: "Wizards of the Coast" }, gamesystem: { name: "5th Edition 2014" } };
const homebrew = { key: "u1-homebrew", displayName: "dev's homebrew", name: "dev's homebrew" };

const fireball = {
  key: "srd_fireball",
  name: "Fireball",
  document: srd,
  castingOptions: [
    { type: "default", damageRoll: null },
    { type: "slot_level_4", damageRoll: "9d6" },
  ],
  school: { key: "evocation", name: "Evocation" },
  classes: [{ key: "srd_sorcerer", name: "Sorcerer" }, { key: "srd_wizard", name: "Wizard" }],
  rangeUnit: "feet",
  shapeSizeUnit: "feet",
  desc: "A bright streak flashes from your pointing finger.",
  level: 3,
  higherLevel: "When you cast this spell using a spell slot of 4th level or higher, the damage increases.",
  targetType: "point",
  rangeText: "150 feet",
  range: 150,
  ritual: false,
  castingTime: "action",
  reactionCondition: null,
  verbal: true,
  somatic: true,
  material: true,
  materialSpecified: "A tiny ball of bat guano and sulfur.",
  materialCost: null,
  materialConsumed: false,
  targetCount: 1,
  savingThrowAbility: "dexterity",
  attackRoll: false,
  damageRoll: "8d6",
  damageTypes: ["fire"],
  duration: "instantaneous",
  shapeType: "sphere",
  shapeSize: 20,
  concentration: false,
};
const shield = {
  key: "srd_shield",
  name: "Shield",
  document: srd,
  castingOptions: [],
  school: { key: "abjuration", name: "Abjuration" },
  classes: [{ key: "srd_wizard", name: "Wizard" }],
  rangeUnit: "feet",
  desc: "An invisible barrier of magical force appears.",
  level: 1,
  targetType: "creature",
  rangeText: "Self",
  range: 0,
  ritual: false,
  castingTime: "reaction",
  reactionCondition: "which you take when you are hit by an attack",
  verbal: true,
  somatic: true,
  material: false,
  targetCount: 1,
  savingThrowAbility: "",
  attackRoll: false,
  damageRoll: "",
  damageTypes: [],
  duration: "1 round",
  concentration: false,
};
const detectMagic = {
  ...shield,
  key: "srd_detect-magic",
  name: "Detect Magic",
  school: { key: "divination", name: "Divination" },
  desc: "For the duration, you sense the presence of magic.",
  ritual: true,
  castingTime: "action",
  reactionCondition: null,
  duration: "10 minutes",
  concentration: true,
};
const mine = {
  ...shield,
  key: "u1-homebrew_zap",
  name: "Zap",
  document: homebrew,
  level: 0,
  castingTime: "action",
  reactionCondition: null,
  desc: "A little shock.",
};

const REFERENCE = {
  "GET /api/spellschools": { content: [{ key: "abjuration", name: "Abjuration" }, { key: "divination", name: "Divination" }, { key: "evocation", name: "Evocation" }] },
  "GET /api/classes": {
    content: [
      { key: "srd_wizard", name: "Wizard", document: { displayName: "5e 2014 Rules" } },
      { key: "srd-2024_wizard", name: "Wizard", document: { displayName: "5e 2024 Rules" } },
      { key: "srd_sorcerer", name: "Sorcerer", document: { displayName: "5e 2014 Rules" } },
    ],
  },
  "GET /api/damagetypes": DAMAGE_TYPES,
};

/** A backend whose spell search filters the way the real one does, and which keeps every search it was asked. */
function stubBackend(extra = {}, spells = [fireball, shield, detectMagic, mine]) {
  const base = stubApi({ ...REFERENCE, ...OWNERSHIP_ROUTES, ...extra });
  const searches = [];
  const fetchMock = vi.fn(async (url, init = {}) => {
    const address = new URL(url, "http://backend");
    const read = (init.method ?? "GET") === "GET";
    if (read && address.pathname === "/api/spells") {
      const params = Object.fromEntries(address.searchParams);
      searches.push(params);
      const found = spells.filter(
        (one) =>
          one.name.toLowerCase().includes((params.name ?? "").toLowerCase()) &&
          (params.level === undefined || String(one.level) === params.level) &&
          (params.school === undefined || one.school.key === params.school) &&
          (params.class === undefined || one.classes.some((c) => c.key === params.class)) &&
          (params.damageType === undefined || one.damageTypes.includes(params.damageType)) &&
          (params.concentration === undefined || String(one.concentration) === params.concentration) &&
          (params.ritual === undefined || String(one.ritual) === params.ritual),
      );
      return new Response(JSON.stringify({ content: found }), { status: 200 });
    }
    return base(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.searches = searches;
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

const filter = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("reading a spell", () => {
  it("shows it like a spell card", async () => {
    stubBackend();
    render(<SpellsPage />);
    expect(screen.getByText("Search for a spell to see its details.")).toBeInTheDocument();

    await pick("Spell", "Fireball");

    expect(await screen.findByRole("heading", { name: "Fireball" })).toBeInTheDocument();
    expect(screen.getByText("3rd-level evocation")).toBeInTheDocument();
    const classes = within(screen.getByLabelText("Classes"));
    expect(classes.getByText("Sorcerer")).toBeInTheDocument();
    expect(classes.getByText("Wizard")).toBeInTheDocument();
    expect(screen.getByText("5e 2014 Rules")).toBeInTheDocument();
    for (const [label, value] of [
      ["Casting time", "1 action"],
      ["Range", "150 feet"],
      ["Components", "V, S, M (A tiny ball of bat guano and sulfur)"],
      ["Duration", "Instantaneous"],
      ["Target", "1 point"],
      ["Area", "20-foot sphere"],
      ["Saving throw", "Dexterity saving throw"],
      ["Damage", "8d6 fire"],
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0); // "Damage" is also a filter's label
      expect(screen.getByText(value)).toBeInTheDocument();
    }
    expect(screen.getByText("A bright streak flashes from your pointing finger.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "At higher levels" })).toBeInTheDocument();
  });

  it("shows how a spell scales with its slot", async () => {
    stubBackend();
    render(<SpellsPage />);

    await pick("Spell", "Fireball");

    const scaling = within(await screen.findByRole("table"));
    expect(scaling.getByText("4th-level slot")).toBeInTheDocument();
    expect(scaling.getByText("9d6")).toBeInTheDocument();
    expect(scaling.queryByText("Base")).not.toBeInTheDocument(); // an option that says nothing isn't a row
  });

  it("says what a reaction is taken in response to, and shows a ritual and concentration", async () => {
    stubBackend();
    render(<SpellsPage />);

    await pick("Spell", "Shield");
    expect(await screen.findByText("1 reaction, which you take when you are hit by an attack")).toBeInTheDocument();
    expect(screen.getByText("Self")).toBeInTheDocument();

    await pick("Spell", "Detect Magic");
    expect(await screen.findByText("1st-level divination (ritual)")).toBeInTheDocument();
    expect(screen.getByText("Concentration, up to 10 minutes")).toBeInTheDocument();
  });

  it("says in the results what each spell is and where it's from", async () => {
    stubBackend();
    render(<SpellsPage />);
    const input = screen.getByRole("combobox", { name: "Spell" });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "s" } }); // two letters at least
    fireEvent.change(input, { target: { value: "sh" } });

    const options = await within(await screen.findByRole("listbox", {}, { timeout: 2500 })).findAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["Shield1st-level abjuration · 5e 2014 Rules"]);
  });
});

describe("filtering", () => {
  async function search(text) {
    const input = screen.getByRole("combobox", { name: "Spell" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: text } });
    await screen.findAllByRole("option", {}, { timeout: 2500 }).catch(() => []);
  }

  it("narrows by level, school and damage type, sending them to the backend", async () => {
    const fetchMock = stubBackend();
    render(<SpellsPage />);
    await screen.findByRole("option", { name: "Evocation" }); // the lists have loaded

    filter("Level", "3");
    filter("School", "evocation");
    filter("Damage", "fire");
    await search("fi");

    await waitFor(() => expect(fetchMock.searches.at(-1)).toMatchObject({ name: "fi", level: "3", school: "evocation", damageType: "fire" }));
    expect(await screen.findByRole("option", { name: /Fireball/ })).toBeInTheDocument();
  });

  it("finds cantrips with a level of 0", async () => {
    const fetchMock = stubBackend();
    render(<SpellsPage />);
    await screen.findByRole("option", { name: "Evocation" });

    filter("Level", "0");
    await search("za");

    await waitFor(() => expect(fetchMock.searches.at(-1)).toMatchObject({ level: "0" }));
    expect(await screen.findByRole("option", { name: /Zap/ })).toBeInTheDocument();
  });

  it("asks for the spells of a class under every set of rules it is in", async () => {
    const fetchMock = stubBackend();
    render(<SpellsPage />);
    await screen.findByRole("option", { name: "Evocation" });
    await waitFor(() => expect(screen.getByLabelText("Class").options.length).toBeGreaterThan(1));

    filter("Class", "Wizard");
    await search("sh");

    await waitFor(() => {
      const classes = fetchMock.searches.filter((params) => params.name === "sh").map((params) => params.class).sort();
      expect(classes).toEqual(["srd-2024_wizard", "srd_wizard"]);
    });
    expect(await screen.findByRole("option", { name: /Shield/ })).toBeInTheDocument();
  });

  it("narrows to concentration spells and to rituals", async () => {
    const fetchMock = stubBackend();
    render(<SpellsPage />);
    await screen.findByRole("option", { name: "Evocation" });

    fireEvent.click(screen.getByRole("button", { name: "Concentration" }));
    fireEvent.click(screen.getByRole("button", { name: "Ritual" }));
    await search("de");

    await waitFor(() => expect(fetchMock.searches.at(-1)).toMatchObject({ name: "de", concentration: "true", ritual: "true" }));
    expect(await screen.findByRole("option", { name: /Detect Magic/ })).toBeInTheDocument();
  });

  it("still searches when the lists for the filters can't be loaded", async () => {
    stubBackend({
      "GET /api/spellschools": () => new Response("{}", { status: 500 }),
      "GET /api/classes": () => new Response("{}", { status: 500 }),
    });
    render(<SpellsPage />);

    await pick("Spell", "Fireball");

    expect(await screen.findByRole("heading", { name: "Fireball" })).toBeInTheDocument();
  });
});

describe("comparing spells", () => {
  it("lines two spells up", async () => {
    stubBackend();
    render(<SpellsPage />);
    await pick("Spell", "Fireball");
    await screen.findByRole("heading", { name: "Fireball" });

    fireEvent.click(screen.getByRole("button", { name: "Compare" }));
    await pick("Compare with", "Shield");

    const table = within(await screen.findByRole("table"));
    expect(table.getByText("Level")).toBeInTheDocument();
    expect(table.getByText("3rd level")).toBeInTheDocument();
    expect(table.getByText("1st level")).toBeInTheDocument();
    expect(table.getByText("Casting time")).toBeInTheDocument();
    expect(table.getByText("1 action")).toBeInTheDocument();
    expect(screen.getByText("An invisible barrier of magical force appears.")).toBeInTheDocument(); // the descriptions, side by side
  });
});

describe("making and changing spells", () => {
  it("makes a spell and shows it once saved", async () => {
    const fetchMock = stubBackend({
      "POST /api/spells": (body) => ({ ...body, key: "u1-homebrew_spark", document: homebrew }),
    });
    render(<SpellsPage />);

    fireEvent.click(screen.getByRole("button", { name: "New spell" }));
    expect(screen.getByRole("heading", { name: "New spell" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Give the spell a name.");

    fireEvent.change(screen.getByLabelText("Spell name"), { target: { value: " Spark " } });
    await screen.findByRole("option", { name: "Evocation" });
    fireEvent.change(screen.getByLabelText("School"), { target: { value: "evocation" } });
    fireEvent.change(screen.getByLabelText("Level"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Range"), { target: { value: "30 feet" } });
    fireEvent.change(screen.getByLabelText("Range distance"), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText("Damage roll"), { target: { value: "1d6" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "A spark leaps to a creature." } });
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("button", { name: "Duplicate" });
    expect(bodiesSentTo(fetchMock, "POST /api/spells")[0]).toMatchObject({
      name: "Spark",
      level: 0,
      school: { key: "evocation", name: "Evocation" },
      castingTime: "action",
      rangeText: "30 feet",
      range: 30,
      duration: "instantaneous",
      damageRoll: "1d6",
      desc: "A spark leaps to a creature.",
      classes: [],
      castingOptions: [],
    });
    expect(screen.getByRole("heading", { name: "Spark" })).toBeInTheDocument();
    expect(screen.getByText("Evocation cantrip")).toBeInTheDocument();
    expect(screen.getByText("dev's homebrew")).toBeInTheDocument();
  });

  it("asks what a reaction is taken in response to, and the cost of materials, only when they matter", async () => {
    stubBackend();
    render(<SpellsPage />);
    fireEvent.click(screen.getByRole("button", { name: "New spell" }));

    expect(screen.queryByLabelText("Reaction condition")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Materials")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Casting time"), { target: { value: "reaction" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Material" }));

    expect(screen.getByLabelText("Reaction condition")).toBeInTheDocument();
    expect(screen.getByLabelText("Materials")).toBeInTheDocument();
    expect(screen.getByLabelText("Material cost (gp)")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Consumed" })).toBeInTheDocument();
  });

  it("chooses classes from the lists, naming the rules each is in", async () => {
    const fetchMock = stubBackend({ "POST /api/spells": (body) => ({ ...body, key: "u1-homebrew_c", document: homebrew }) });
    render(<SpellsPage />);
    fireEvent.click(screen.getByRole("button", { name: "New spell" }));
    await screen.findByRole("option", { name: "Evocation" });
    fireEvent.change(screen.getByLabelText("Spell name"), { target: { value: "Classy" } });
    fireEvent.change(screen.getByLabelText("School"), { target: { value: "evocation" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Fancy." } });

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Classes" }));
    fireEvent.click(await screen.findByRole("option", { name: "Wizard (5e 2024 Rules)" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("button", { name: "Duplicate" });
    expect(bodiesSentTo(fetchMock, "POST /api/spells")[0].classes).toEqual([{ key: "srd-2024_wizard", name: "Wizard" }]);
  });

  it("changes one of the user's own, starting from what it is", async () => {
    const fetchMock = stubBackend({
      "PUT /api/spells/u1-homebrew_zap": (body) => ({ ...body, document: homebrew }),
    });
    render(<SpellsPage />);
    await pick("Spell", "Zap");

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    expect(screen.getByRole("heading", { name: "Edit Zap" })).toBeInTheDocument();
    expect(screen.getByLabelText("Spell name")).toHaveValue("Zap");
    expect(screen.getByLabelText("Level")).toHaveValue("0");
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "A big shock." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByText("A big shock.");
    expect(bodiesSentTo(fetchMock, "PUT /api/spells/u1-homebrew_zap")[0]).toMatchObject({ key: "u1-homebrew_zap", name: "Zap", level: 0, desc: "A big shock." });
  });

  it("shows why it couldn't be saved, and stays", async () => {
    stubBackend({ "POST /api/spells": () => new Response(JSON.stringify({ detail: "A spell with that key already exists" }), { status: 409 }) });
    render(<SpellsPage />);
    fireEvent.click(screen.getByRole("button", { name: "New spell" }));
    await screen.findByRole("option", { name: "Evocation" });
    fireEvent.change(screen.getByLabelText("Spell name"), { target: { value: "Zap" } });
    fireEvent.change(screen.getByLabelText("School"), { target: { value: "evocation" } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "x" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("A spell with that key already exists");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });
});

describe("copying and deleting", () => {
  it("offers Duplicate but not Edit or Delete on a spell from a source, and opens the copy to change", async () => {
    stubBackend({
      "POST /api/spells/srd_shield/copy": () => ({ ...shield, key: "u1-homebrew_shield", document: homebrew, derivedFrom: "srd_shield" }),
    });
    render(<SpellsPage />);
    await pick("Spell", "Shield");

    expect(await screen.findByRole("button", { name: "Duplicate" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));

    expect(await screen.findByRole("heading", { name: "Edit Shield" })).toBeInTheDocument();
    expect(screen.getByText("Based on srd_shield")).toBeInTheDocument();
  });

  it("deletes one of the user's own, after asking", async () => {
    const fetchMock = stubBackend({ "DELETE /api/spells/u1-homebrew_zap": null });
    render(<SpellsPage />);
    await pick("Spell", "Zap");

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete Zap?")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Zap" })).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([url, init]) => url === "/api/spells/u1-homebrew_zap" && init?.method === "DELETE")).toBe(true);
  });
});
