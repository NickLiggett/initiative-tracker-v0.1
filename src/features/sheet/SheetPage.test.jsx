import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { bodiesSentTo, stubApi } from "../../test/fakeApi";
import SheetPage from "./SheetPage";

afterEach(() => vi.unstubAllGlobals());

const thorin = {
  id: 7,
  name: "Thorin",
  ruleset: "5e-2014",
  classKey: "srd_fighter",
  className: "Fighter",
  speciesKey: null,
  speciesName: "Dwarf",
  level: 5,
  armorClass: 18,
  hitPoints: 52,
  initiativeBonus: 1,
  notes: "Carries a grudge",
  owner: "dev",
  playedBy: "anna",
  role: "OWNER",
  vitals: { currentHp: 30, tempHp: 5, heroicInspiration: false, conditions: [], exhaustion: 0, deathSaveSuccesses: 0, deathSaveFailures: 0 },
};

function open(character = thorin) {
  const fetchMock = stubApi({
    "GET /api/players/7": character,
    "PATCH /api/players/7/vitals": (body) => ({ ...character, vitals: { ...character.vitals, ...body } }),
  });
  render(<SheetPage playerId={7} />);
  return fetchMock;
}

const openTab = async (name) => fireEvent.click(await screen.findByRole("tab", { name }));
const patches = (fetchMock) => bodiesSentTo(fetchMock, "PATCH /api/players/7/vitals");

describe("the character sheet", () => {
  it("shows the character, their numbers and hit points, and names the tab for them", async () => {
    open();

    expect(await screen.findByRole("heading", { name: "Thorin" })).toBeInTheDocument();
    expect(screen.getByText("Level 5 Fighter · Dwarf")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Hit points 30 of 52, 5 temporary" })).toBeInTheDocument();
    await openTab("Description");
    expect(screen.getByText("Carries a grudge")).toBeInTheDocument();
    expect(document.title).toBe("Thorin · Character sheet");
  });

  it("deals damage to temporary hit points first", async () => {
    const fetchMock = open();
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.click(screen.getByRole("button", { name: "Manage hit points" }));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Damage" }));

    await waitFor(() => expect(patches(fetchMock)).toEqual([{ currentHp: 27, tempHp: 0 }]));
  });

  it("heals no further than the maximum", async () => {
    const fetchMock = open();
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.click(screen.getByRole("button", { name: "Manage hit points" }));
    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Heal" }));

    await waitFor(() => expect(patches(fetchMock)).toEqual([{ currentHp: 52 }]));
  });

  it("saves a condition, inspiration and a death save as they are tapped, and shows the answer", async () => {
    const fetchMock = open();
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.click(screen.getByRole("button", { name: "Show the other conditions" }));
    fireEvent.click(screen.getByRole("button", { name: "Prone" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Prone" })).toHaveAttribute("aria-pressed", "true"));
    fireEvent.click(screen.getByRole("button", { name: "Heroic Inspiration" }));
    fireEvent.click(screen.getByRole("button", { name: "Failures 2" }));

    await waitFor(() => expect(patches(fetchMock)).toHaveLength(3));
    expect(patches(fetchMock)).toEqual([{ conditions: ["Prone"] }, { heroicInspiration: true }, { deathSaveFailures: 2 }]);
  });

  it("lists attacks and features, spends a use with a tap and gives uses back on a rest", async () => {
    const withLists = {
      ...thorin,
      version: 4,
      sheet: {
        attacks: [{ name: "Longsword", bonus: "+9", damage: "1d8+5 slashing" }],
        features: [{ name: "Blood Maledict", uses: { max: 2, used: 0, per: "short" } }, { name: "Revealed Arcana", uses: { max: 1, used: 1, per: "long" } }],
      },
    };
    let saved = withLists; // the backend keeps what it is sent, and a look at it afterwards finds that
    const fetchMock = stubApi({
      "GET /api/players/7": () => saved,
      "PUT /api/players/7/sheet": (body) => (saved = { ...saved, version: saved.version + 1, sheet: body.sheet }),
    });
    render(<SheetPage playerId={7} />);
    expect(await screen.findByText("Longsword")).toBeInTheDocument();
    expect(screen.getByText("1d8+5 slashing")).toBeInTheDocument();

    await openTab("Features");
    fireEvent.click(screen.getAllByRole("button", { name: "Spend a use of Blood Maledict" })[0]);
    await waitFor(() => expect(screen.getByText("1 of 2, back on a short rest")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Long rest" }));
    await waitFor(() => expect(screen.getByText("2 of 2, back on a short rest")).toBeInTheDocument());

    const sent = bodiesSentTo(fetchMock, "PUT /api/players/7/sheet");
    expect(sent[0]).toMatchObject({ version: 4 });
    expect(sent[0].sheet.features[0].uses.used).toBe(1);
    expect(sent[1]).toMatchObject({ version: 5 });
    expect(sent[1].sheet.features.map((feature) => feature.uses.used)).toEqual([0, 0]);
  });

  it("shows the lists to a DM, with nothing to tap", async () => {
    stubApi({
      "GET /api/players/7": { ...thorin, role: "PARTY", sheet: { features: [{ name: "Blood Maledict", uses: { max: 2, used: 1, per: "short" } }] } },
    });
    render(<SheetPage playerId={7} />);

    await openTab("Features");
    expect(await screen.findByText("1 of 2, back on a short rest")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Short rest" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take back a use of Blood Maledict" })).toHaveAttribute("aria-disabled", "true");
  });

  it("shows spell slots, pact slots and hit dice, spends them with a tap and refills them on a rest", async () => {
    const withCasting = {
      ...thorin,
      level: 14,
      version: 2,
      sheet: {
        abilities: { wis: 16 },
        spellcasting: { ability: "wis" },
        slots: { 1: { max: 2, used: 0 } },
        pact: { max: 2, used: 0, level: 2 },
        hitDice: [{ die: "d10", max: 4, used: 0 }],
        spells: [{ name: "Misty Step", level: 2, school: "Conjuration", prepared: false }, { name: "Light", level: 0 }],
      },
    };
    let saved = withCasting;
    const fetchMock = stubApi({
      "GET /api/players/7": () => saved,
      "PUT /api/players/7/sheet": (body) => (saved = { ...saved, version: saved.version + 1, sheet: body.sheet }),
    });
    render(<SheetPage playerId={7} />);

    await openTab("Spells");
    expect(await screen.findByText("Wisdom: spell save DC 16, spell attack +8")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "2nd level" })).toHaveTextContent("Misty Step");
    expect(screen.getByRole("region", { name: "Cantrip" })).toHaveTextContent("Light");
    expect(screen.getByRole("button", { name: "Short rest" })).toBeDisabled(); // nothing spent yet

    fireEvent.click(screen.getAllByRole("button", { name: "Spend Level 1 slot" })[0]);
    await waitFor(() => expect(screen.getByText("1 of 2")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("button", { name: "Spend Pact slot" })[0]);
    await waitFor(() => expect(screen.getAllByText("1 of 2")).toHaveLength(2));
    fireEvent.click(screen.getAllByRole("button", { name: "Spend d10 hit dice" })[0]);
    await waitFor(() => expect(screen.getByText("3 of 4")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Prepare Misty Step" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Unprepare Misty Step" })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Short rest" })); // only the pact slots come back
    await waitFor(() => expect(saved.sheet.pact.used).toBe(0));
    expect(saved.sheet.slots[1].used).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Long rest" }));
    await waitFor(() => expect(saved.sheet.slots[1].used).toBe(0));
    expect(saved.sheet.hitDice[0].used).toBe(0); // half of 4 is 2 and only 1 was spent
    expect(bodiesSentTo(fetchMock, "PUT /api/players/7/sheet").map((sent) => sent.version)).toEqual([2, 3, 4, 5, 6, 7]);
  });

  it("says why when it can't be opened", async () => {
    stubApi({ "GET /api/players/7": new Response(JSON.stringify({ detail: "No player 7" }), { status: 404 }) });
    render(<SheetPage playerId={7} />);

    expect(await screen.findByText("This character isn't there, or isn't shared with you.")).toBeInTheDocument();
  });

  it("lets a DM change the live fields of a party member's character", async () => {
    const fetchMock = open({ ...thorin, role: "PARTY", owner: "anna" });
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.click(screen.getByRole("button", { name: "Show the other conditions" }));
    fireEvent.click(screen.getByRole("button", { name: "Stunned" }));

    await waitFor(() => expect(patches(fetchMock)).toEqual([{ conditions: ["Stunned"] }]));
  });
});

const item = (key, name, system) => ({ key, name, document: { gamesystem: { key: system } } });
const REFERENCE = {
  "GET /api/classes": { content: [item("srd_fighter", "Fighter", "5e-2014")] },
  "GET /api/species": { content: [item("srd_dwarf", "Dwarf", "5e-2014")] },
};
const field = (label) => screen.getByLabelText(label);
const type = (label, value) => fireEvent.change(field(label), { target: { value } });

describe("changing who the character is, on the sheet", () => {
  it("starts from the character, saves, and shows the sheet again with the change", async () => {
    let saved = { ...thorin, version: 3 }; // what the backend has, which the sheet asks for again after the save
    const fetchMock = stubApi({
      "GET /api/players/7": () => saved,
      "PUT /api/players/7": (body) => (saved = { ...saved, ...body }),
      ...REFERENCE,
    });
    render(<SheetPage playerId={7} />);
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    expect(field("Name")).toHaveValue("Thorin");
    type("Level", "6");
    type("Hit points", "60");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // (the editor's preview says the same, so wait for it to close)
    await waitFor(() => expect(screen.queryByText("Edit Thorin")).not.toBeInTheDocument(), { timeout: 4000 });
    expect(await screen.findByText("Level 6 Fighter · Dwarf")).toBeInTheDocument();
    expect(bodiesSentTo(fetchMock, "PUT /api/players/7")[0]).toMatchObject({ name: "Thorin", level: 6, hitPoints: 60, version: 3 });
  });

  it("lets whoever only plays the character change its numbers, and nothing else", async () => {
    stubApi({ "GET /api/players/7": { ...thorin, role: "PLAYER" }, ...REFERENCE });
    render(<SheetPage playerId={7} />);
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));

    expect(field("Name")).toBeDisabled();
    expect(field("Class")).toBeDisabled();
    expect(field("Hit points")).toBeEnabled();
  });

  it("goes back to the sheet on Cancel", async () => {
    stubApi({ "GET /api/players/7": thorin, ...REFERENCE });
    render(<SheetPage playerId={7} />);
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.click(screen.getByRole("button", { name: "Edit details" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByRole("heading", { name: "Thorin" })).toBeInTheDocument();
  });
});

describe("the inventory, on the sheet", () => {
  const inventory = { cp: 0, sp: 0, gp: 12, pp: 0, items: [{ id: 1, name: "Rope", quantity: 1, equipped: false, attuned: false, notes: "" }] };

  it("is on the page, and saves in place", async () => {
    const fetchMock = stubApi({ "GET /api/players/7": thorin, "GET /api/players/7/inventory": inventory, "PUT /api/players/7/inventory": (body) => body });
    render(<SheetPage playerId={7} />);

    await openTab("Inventory");
    expect(await screen.findByDisplayValue("Rope")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Quantity of line 1"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(bodiesSentTo(fetchMock, "PUT /api/players/7/inventory")).toHaveLength(1));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
  });

  it("can only be read by a DM seeing a party member", async () => {
    stubApi({ "GET /api/players/7": { ...thorin, role: "PARTY" }, "GET /api/players/7/inventory": inventory });
    render(<SheetPage playerId={7} />);

    await openTab("Inventory");
    expect(await screen.findByDisplayValue("Rope")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });
});

describe("the header and the ability scores", () => {
  const scored = { ...thorin, version: 2, sheet: { abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 11 }, speed: { walk: 30 } } };

  it("shows the numbers a player looks at most, and the six scores with their modifiers", async () => {
    stubApi({ "GET /api/players/7": scored });
    render(<SheetPage playerId={7} />);

    await screen.findByRole("heading", { name: "Thorin" });
    expect(screen.getByText("30 ft.")).toBeInTheDocument();
    expect(screen.getByText("Proficiency").parentElement).toHaveTextContent("+3"); // at level 5
    const strength = within(screen.getByRole("listitem", { name: "Strength" }));
    expect(strength.getByText("+3")).toBeInTheDocument();
    expect(strength.getByText("16")).toBeInTheDocument();
  });

  it("sets a score from its tile, and refuses one out of range", async () => {
    let saved = scored; // what the backend has, which the sheet asks for again after the save
    const fetchMock = stubApi({
      "GET /api/players/7": () => saved,
      "PUT /api/players/7/sheet": (body) => (saved = { ...scored, sheet: body.sheet, version: 3 }),
    });
    render(<SheetPage playerId={7} />);
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.click(screen.getByRole("button", { name: /^Strength 16, modifier \+3/ }));
    fireEvent.change(screen.getByLabelText("Strength score"), { target: { value: "31" } });
    expect(screen.getByRole("button", { name: "Set" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Strength score"), { target: { value: "18" } });
    fireEvent.click(screen.getByRole("button", { name: "Set" }));

    await waitFor(() => expect(bodiesSentTo(fetchMock, "PUT /api/players/7/sheet")).toHaveLength(1));
    expect(bodiesSentTo(fetchMock, "PUT /api/players/7/sheet")[0]).toMatchObject({ version: 2, sheet: { abilities: { str: 18, dex: 12 } } });
    await waitFor(() => expect(screen.getByRole("listitem", { name: "Strength" })).toHaveTextContent("+4"));
  });

  it("only shows the scores to a DM seeing a party member", async () => {
    stubApi({ "GET /api/players/7": { ...scored, role: "PARTY" } });
    render(<SheetPage playerId={7} />);
    await screen.findByRole("heading", { name: "Thorin" });

    expect(screen.queryByRole("button", { name: /Strength .*Change/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Adjustments" })).not.toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: "Strength" })).toHaveTextContent("16");
  });

  it("offers empty scores to fill in on a sheet that has none", async () => {
    stubApi({ "GET /api/players/7": thorin });
    render(<SheetPage playerId={7} />);
    await screen.findByRole("heading", { name: "Thorin" });

    expect(screen.getByRole("button", { name: "Strength not set. Change" })).toBeInTheDocument();
  });
});

describe("saves and skills", () => {
  const scored = { ...thorin, version: 2, sheet: { abilities: { str: 16, dex: 12, con: 14, int: 8, wis: 10, cha: 11 }, saves: ["str"], skills: { athletics: "proficient" } } };

  it("takes a skill one step on from its mark, and the bonus follows", async () => {
    let saved = scored;
    const fetchMock = stubApi({
      "GET /api/players/7": () => saved,
      "PUT /api/players/7/sheet": (body) => (saved = { ...scored, sheet: body.sheet, version: 3 }),
    });
    render(<SheetPage playerId={7} />);
    await screen.findByRole("heading", { name: "Thorin" });
    const athletics = () => screen.getByText("Athletics (STR)").closest("div");
    expect(athletics()).toHaveTextContent("+6"); // +3 and +3

    fireEvent.click(screen.getByRole("button", { name: "Athletics proficiency: proficient. Change" }));

    await waitFor(() => expect(bodiesSentTo(fetchMock, "PUT /api/players/7/sheet")[0].sheet.skills).toEqual({ athletics: "expertise" }));
    await waitFor(() => expect(athletics()).toHaveTextContent("+9"));
  });

  it("turns a saving throw on from its mark", async () => {
    const fetchMock = stubApi({ "GET /api/players/7": scored, "PUT /api/players/7/sheet": (body) => ({ ...scored, sheet: body.sheet }) });
    render(<SheetPage playerId={7} />);
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.click(screen.getByRole("button", { name: "Dexterity saving throw proficiency: none. Change" }));

    await waitFor(() => expect(bodiesSentTo(fetchMock, "PUT /api/players/7/sheet")[0].sheet.saves).toEqual(["str", "dex"]));
  });

  it("shows the marks without a way to change them to a DM seeing a party member", async () => {
    stubApi({ "GET /api/players/7": { ...scored, role: "PARTY" } });
    render(<SheetPage playerId={7} />);
    await screen.findByRole("heading", { name: "Thorin" });

    expect(screen.queryByRole("button", { name: /proficiency: .*Change/ })).not.toBeInTheDocument();
  });
});

describe("the tabs", () => {
  it("open on Actions, and say what is missing on a tab with nothing in it", async () => {
    open();
    await screen.findByRole("heading", { name: "Thorin" });

    expect(screen.getByRole("tab", { name: "Actions" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("No attacks yet.")).toBeInTheDocument();
    await openTab("Spells");
    expect(screen.getByText("No spells yet.")).toBeInTheDocument();
    expect(screen.getByText("No spell slots or hit dice yet.")).toBeInTheDocument();
    await openTab("Features");
    expect(screen.getByText("No features yet.")).toBeInTheDocument();
    expect(screen.queryByText("No attacks yet.")).not.toBeInTheDocument();
  });

  it("show the attacks on one tab and the features on another", async () => {
    stubApi({ "GET /api/players/7": { ...thorin, sheet: { attacks: [{ name: "Longsword" }], features: [{ name: "Second Wind" }] } } });
    render(<SheetPage playerId={7} />);

    expect(await screen.findByText("Longsword")).toBeInTheDocument();
    expect(screen.queryByText("Second Wind")).not.toBeInTheDocument();
    await openTab("Features");
    expect(screen.getByText("Second Wind")).toBeInTheDocument();
    expect(screen.queryByText("Longsword")).not.toBeInTheDocument();
  });
});

describe("changing things in place", () => {
  const plain = { ...thorin, version: 2, sheet: { speed: { walk: 30 }, senses: ["Darkvision 60 ft."], defenses: { resistances: ["fire"] } } };

  /** A backend that keeps what it is sent, so that the sheet's look at it afterwards finds the change. */
  function keeping(character) {
    let saved = character;
    const fetchMock = stubApi({
      "GET /api/players/7": () => saved,
      "PUT /api/players/7/sheet": (body) => (saved = { ...saved, version: saved.version + 1, sheet: body.sheet }),
    });
    return { fetchMock, sheet: () => saved.sheet };
  }

  it("sets the walking speed from the header, and refuses what isn't feet", async () => {
    const backend = keeping(plain);
    render(<SheetPage playerId={7} />);
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.click(screen.getByRole("button", { name: "Edit Walking speed" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Walking speed" }), { target: { value: "fast" } });
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Walking speed" }), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(backend.sheet().speed).toEqual({ walk: 40 }));
    expect(await screen.findByText("40 ft.")).toBeInTheDocument();
    expect(backend.sheet().senses).toEqual(["Darkvision 60 ft."]); // the rest is as it was
  });

  it("changes the senses, one a line", async () => {
    const backend = keeping(plain);
    render(<SheetPage playerId={7} />);
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.click(screen.getByRole("button", { name: "Edit Senses" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Senses" }), { target: { value: "Darkvision 120 ft.\nBlindsight 10 ft." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(backend.sheet().senses).toEqual(["Darkvision 120 ft.", "Blindsight 10 ft."]));
  });

  it("changes a list and a personal detail on the Description tab, which shows the empty ones too", async () => {
    const backend = keeping(plain);
    render(<SheetPage playerId={7} />);
    await openTab("Description");

    expect(screen.getByText("Immunities: none")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Edit Resistances" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Resistances" }), { target: { value: "fire\nnecrotic" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(backend.sheet().defenses).toEqual({ resistances: ["fire", "necrotic"] }));

    fireEvent.click(await screen.findByRole("button", { name: "Edit Alignment" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Alignment" }), { target: { value: "Chaotic Good" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(backend.sheet().personal).toEqual({ alignment: "Chaotic Good" }));
    expect(await screen.findByText("Alignment: Chaotic Good")).toBeInTheDocument();
  });

  it("leaves it unchanged on Cancel", async () => {
    const backend = keeping(plain);
    render(<SheetPage playerId={7} />);
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.click(screen.getByRole("button", { name: "Edit Senses" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Senses" }), { target: { value: "nothing" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(backend.fetchMock.mock.calls.some(([, init]) => init?.method === "PUT")).toBe(false);
  });

  it("shows a DM's view of a party member without a pencil", async () => {
    stubApi({ "GET /api/players/7": { ...plain, role: "PARTY" } });
    render(<SheetPage playerId={7} />);
    await screen.findByRole("heading", { name: "Thorin" });
    await openTab("Description");

    expect(screen.queryByRole("button", { name: /^Edit (Walking speed|Senses|Resistances|Alignment)/ })).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Resistances" })).toHaveTextContent("fire");
    expect(screen.queryByText("Immunities: none")).not.toBeInTheDocument();
  });
});

describe("attacks and features, in place", () => {
  const armed = {
    ...thorin,
    version: 2,
    sheet: { attacks: [{ name: "Longsword", bonus: "+9", damage: "1d8+5 slashing" }], features: [{ name: "Second Wind", source: "Fighter", uses: { max: 1, used: 1, per: "short" } }] },
  };

  function keeping(character) {
    let saved = character;
    const fetchMock = stubApi({
      "GET /api/players/7": () => saved,
      "PUT /api/players/7/sheet": (body) => (saved = { ...saved, version: saved.version + 1, sheet: body.sheet }),
    });
    return { fetchMock, sheet: () => saved.sheet };
  }
  const fill = (label, value) => fireEvent.change(screen.getByRole("textbox", { name: label }), { target: { value } });

  it("adds an attack, and refuses one with no name", async () => {
    const backend = keeping(armed);
    render(<SheetPage playerId={7} />);
    await screen.findByText("Longsword");

    fireEvent.click(screen.getByRole("button", { name: "Add an attack" }));
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    fill("Name", "Dagger");
    fill("Hit", "+7");
    fill("Damage", "1d4+4 piercing");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(backend.sheet().attacks).toEqual([{ name: "Longsword", bonus: "+9", damage: "1d8+5 slashing" }, { name: "Dagger", bonus: "+7", damage: "1d4+4 piercing" }]));
    expect(await screen.findByText("Dagger")).toBeInTheDocument();
  });

  it("changes an attack from its pencil, and deletes it", async () => {
    const backend = keeping(armed);
    render(<SheetPage playerId={7} />);
    await screen.findByText("Longsword");

    fireEvent.click(screen.getByRole("button", { name: "Edit Longsword" }));
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Longsword");
    fill("Hit", "+10");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(backend.sheet().attacks[0].bonus).toBe("+10"));

    fireEvent.click(await screen.findByRole("button", { name: "Edit Longsword" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(backend.sheet().attacks).toBeUndefined());
    expect(backend.sheet().features).toHaveLength(1); // the rest is as it was
    expect(await screen.findByText("No attacks yet.")).toBeInTheDocument();
  });

  it("adds a feature with uses, which must say when they come back", async () => {
    const backend = keeping(armed);
    render(<SheetPage playerId={7} />);
    await openTab("Features");

    fireEvent.click(await screen.findByRole("button", { name: "Add a feature" }));
    fill("Name", "Action Surge");
    fill("Uses", "2");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled(); // no rest chosen yet
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Comes back on" }));
    fireEvent.click(await screen.findByRole("option", { name: "Long rest" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(backend.sheet().features[1]).toEqual({ name: "Action Surge", uses: { max: 2, used: 0, per: "long" } }));
  });

  it("keeps the uses spent when a feature is changed", async () => {
    const backend = keeping(armed);
    render(<SheetPage playerId={7} />);
    await openTab("Features");

    fireEvent.click(await screen.findByRole("button", { name: "Edit Second Wind" }));
    fill("Description", "Heal 1d10 + level.");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(backend.sheet().features[0]).toEqual({ name: "Second Wind", source: "Fighter", description: "Heal 1d10 + level.", uses: { max: 1, used: 1, per: "short" } }));
  });

  it("offers nothing to change to a DM seeing a party member", async () => {
    stubApi({ "GET /api/players/7": { ...armed, role: "PARTY" } });
    render(<SheetPage playerId={7} />);
    await screen.findByText("Longsword");

    expect(screen.queryByRole("button", { name: "Add an attack" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Longsword" })).not.toBeInTheDocument();
  });
});

describe("spells, in place", () => {
  const caster = {
    ...thorin,
    level: 5,
    version: 2,
    sheet: {
      abilities: { wis: 16 },
      spellcasting: { ability: "wis" },
      slots: { 1: { max: 2, used: 1 } },
      spells: [{ name: "Misty Step", level: 2, school: "Conjuration" }],
    },
  };

  function keeping(character) {
    let saved = character;
    const fetchMock = stubApi({
      "GET /api/players/7": () => saved,
      "PUT /api/players/7/sheet": (body) => (saved = { ...saved, version: saved.version + 1, sheet: body.sheet }),
      "GET /api/spells": { content: [] },
    });
    return { fetchMock, sheet: () => saved.sheet };
  }
  const fill = (label, value) => fireEvent.change(screen.getByRole("textbox", { name: label }), { target: { value } });

  it("sets the spellcasting ability, and the save DC follows", async () => {
    const backend = keeping(caster);
    render(<SheetPage playerId={7} />);
    await openTab("Spells");
    expect(await screen.findByText("Wisdom: spell save DC 14, spell attack +6")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Spellcasting ability" }));
    fireEvent.click(await screen.findByRole("option", { name: "Not a spellcaster" }));

    await waitFor(() => expect(backend.sheet().spellcasting).toBeUndefined());
    await waitFor(() => expect(screen.queryByText(/spell save DC/)).not.toBeInTheDocument());
  });

  it("adds a spell as written, which starts at 1st level and can be changed to another", async () => {
    const backend = keeping(caster);
    render(<SheetPage playerId={7} />);
    await openTab("Spells");

    fireEvent.change(await screen.findByRole("combobox", { name: "Add a spell" }), { target: { value: "Fire Bolt" } });
    fireEvent.click(screen.getByRole("button", { name: "Add as written" }));
    await waitFor(() => expect(backend.sheet().spells.map((spell) => [spell.name, spell.level])).toEqual([["Misty Step", 2], ["Fire Bolt", 1]]));

    fireEvent.click(await screen.findByRole("button", { name: "Edit Fire Bolt" }));
    fill("Level", "0");
    fill("Notes", "Used a lot");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(backend.sheet().spells[1]).toEqual({ name: "Fire Bolt", level: 0, notes: "Used a lot" }));
    expect(await screen.findByRole("region", { name: "Cantrip" })).toHaveTextContent("Fire Bolt");
  });

  it("refuses a level that isn't 0 to 9, and deletes a spell", async () => {
    const backend = keeping(caster);
    render(<SheetPage playerId={7} />);
    await openTab("Spells");

    fireEvent.click(await screen.findByRole("button", { name: "Edit Misty Step" }));
    fill("Level", "12");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(backend.sheet().spells).toBeUndefined());
    expect(backend.sheet().slots).toEqual({ 1: { max: 2, used: 1 } }); // the rest is as it was
  });

  it("changes the slot totals and hit dice, keeping what is spent", async () => {
    const backend = keeping(caster);
    render(<SheetPage playerId={7} />);
    await openTab("Spells");

    fireEvent.click(await screen.findByRole("button", { name: "Edit slots and hit dice" }));
    fill("Level 1 slots", "4");
    fill("Level 2 slots", "2");
    fireEvent.click(screen.getByRole("button", { name: "Add hit dice" }));
    fill("How many hit dice 1", "5");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(backend.sheet().slots).toEqual({ 1: { max: 4, used: 1 }, 2: { max: 2, used: 0 } }));
    expect(backend.sheet().hitDice).toEqual([{ die: "d8", max: 5, used: 0 }]);
    expect(backend.sheet().spells).toHaveLength(1);
  });

  it("offers a DM seeing a party member nothing to change", async () => {
    stubApi({ "GET /api/players/7": { ...caster, role: "PARTY" } });
    render(<SheetPage playerId={7} />);
    await openTab("Spells");

    expect(await screen.findByRole("region", { name: "2nd level" })).toHaveTextContent("Misty Step");
    expect(screen.queryByRole("button", { name: "Edit Misty Step" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit slots and hit dice" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Spellcasting ability" })).not.toBeInTheDocument();
  });
});

describe("adjustments", () => {
  const dex = { ...thorin, version: 2, sheet: { abilities: { str: 10, dex: 18, con: 10, int: 10, wis: 10, cha: 10 } } };

  it("adds one to a saving throw with a note, which shows in the number", async () => {
    let saved = dex;
    const fetchMock = stubApi({
      "GET /api/players/7": () => saved,
      "PUT /api/players/7/sheet": (body) => (saved = { ...saved, version: saved.version + 1, sheet: body.sheet }),
    });
    render(<SheetPage playerId={7} />);
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.click(screen.getByRole("button", { name: "Adjustments" }));
    fireEvent.click(screen.getByRole("button", { name: "Add an adjustment" }));
    fireEvent.mouseDown(screen.getByLabelText("Adjusts, 1"));
    fireEvent.click(await screen.findByRole("option", { name: "Saving throws: Dexterity saving throw" }));
    fireEvent.change(screen.getByLabelText("Bonus, 1"), { target: { value: "+1" } });
    fireEvent.change(screen.getByLabelText("Note, 1"), { target: { value: "Cloak of Protection" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(bodiesSentTo(fetchMock, "PUT /api/players/7/sheet")[0]).toMatchObject({ version: 2, sheet: { abilities: { dex: 18 }, adjustments: { "save.dex": { bonus: 1, note: "Cloak of Protection" } } } }));
    expect(await screen.findByLabelText("Adjusted: +1 Cloak of Protection")).toBeInTheDocument();
  });

  it("will not save an adjustment with nothing chosen", async () => {
    stubApi({ "GET /api/players/7": dex });
    render(<SheetPage playerId={7} />);
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.click(screen.getByRole("button", { name: "Adjustments" }));
    fireEvent.click(screen.getByRole("button", { name: "Add an adjustment" }));
    fireEvent.change(screen.getByLabelText("Bonus, 1"), { target: { value: "2" } });

    expect(screen.getByText("Choose what each adjustment is for, or remove it.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("takes the existing ones away when they are removed", async () => {
    const withOne = { ...dex, sheet: { ...dex.sheet, adjustments: { "save.dex": { bonus: 1 } } } };
    let saved = withOne;
    const fetchMock = stubApi({
      "GET /api/players/7": () => saved,
      "PUT /api/players/7/sheet": (body) => (saved = { ...saved, version: saved.version + 1, sheet: body.sheet }),
    });
    render(<SheetPage playerId={7} />);
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.click(screen.getByRole("button", { name: "Adjustments" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove adjustment 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(bodiesSentTo(fetchMock, "PUT /api/players/7/sheet")).toHaveLength(1));
    expect(bodiesSentTo(fetchMock, "PUT /api/players/7/sheet")[0].sheet.adjustments).toBeUndefined();
  });
});

describe("conditions and exhaustion", () => {
  it("shows only the conditions that apply, with the rest behind the arrow", async () => {
    open({ ...thorin, vitals: { ...thorin.vitals, conditions: ["Poisoned"] } });
    await screen.findByRole("heading", { name: "Thorin" });

    const applied = within(screen.getByRole("list", { name: "Applied conditions" }));
    expect(applied.getByRole("button", { name: "Poisoned" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Prone" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Show the other conditions" }));
    const others = within(screen.getByRole("list", { name: "Other conditions" }));
    expect(others.getByRole("button", { name: "Prone" })).toBeInTheDocument();
    expect(others.queryByRole("button", { name: "Poisoned" })).not.toBeInTheDocument(); // it is already above

    fireEvent.click(screen.getByRole("button", { name: "Hide the other conditions" }));
    expect(screen.queryByRole("button", { name: "Prone" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Poisoned" })).toBeInTheDocument(); // still shown
  });

  it("sets exhaustion on a bar of six steps, and lowers it by tapping the level it is at", async () => {
    let kept = { ...thorin, vitals: { ...thorin.vitals, exhaustion: 2 } };
    const fetchMock = stubApi({
      "GET /api/players/7": () => kept,
      "PATCH /api/players/7/vitals": (body) => (kept = { ...kept, vitals: { ...kept.vitals, ...body } }),
    });
    render(<SheetPage playerId={7} />);
    await screen.findByRole("heading", { name: "Thorin" });
    expect(screen.getByText("Level 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Exhaustion level 2" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Exhaustion level 3" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Exhaustion level 4" }));
    await waitFor(() => expect(screen.getByText("Level 4")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Exhaustion level 4" }));
    await waitFor(() => expect(screen.getByText("Level 3")).toBeInTheDocument());

    expect(patches(fetchMock)).toEqual([{ exhaustion: 4 }, { exhaustion: 3 }]);
  });
});

