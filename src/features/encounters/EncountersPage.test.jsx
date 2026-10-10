import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { bodiesSentTo, stubApi } from "../../test/fakeApi";
import EncountersPage from "./EncountersPage";

beforeEach(() => vi.spyOn(Math, "random").mockReturnValue(0.5)); // a d20 roll of 11
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const srd = { key: "srd-2014", displayName: "5e 2014 Rules", name: "SRD" };

const goblin = {
  key: "srd_goblin",
  name: "Goblin",
  challengeRating: 0.25,
  experiencePoints: 50,
  armorClass: 15,
  hitPoints: 7,
  initiativeBonus: 2,
  document: srd,
  actions: [
    { name: "Scimitar", actionType: "ACTION", desc: "Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage." },
    { name: "Shortbow", actionType: "ACTION", desc: "Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage." },
  ],
};
const ogre = { key: "srd_ogre", name: "Ogre", challengeRating: 2, experiencePoints: 450, armorClass: 11, hitPoints: 59, initiativeBonus: -1, document: srd };

const ana = { id: 1, name: "Ana", ruleset: "5e-2024", className: "Fighter", speciesName: "Dwarf", level: 3, armorClass: 18, hitPoints: 30, initiativeBonus: 1, role: "OWNER" };
const bo = { id: 2, name: "Bo", ruleset: "5e-2024", className: "Wizard", level: 3, armorClass: 12, hitPoints: 18, initiativeBonus: 3, role: "OWNER" };
const cy = { id: 3, name: "Cy", ruleset: "5e-2024", className: "Cleric", level: 3, armorClass: 16, hitPoints: 24, initiativeBonus: 0, role: "PARTY", playedBy: "cyrus" };

function stubBackend({ mine = [ana, bo], party = [cy], extra = {} } = {}) {
  const base = stubApi({ "GET /api/players": mine, "GET /api/party/players": party, "GET /api/me/encounters": {}, ...extra });
  const fetchMock = vi.fn(async (url, init = {}) => {
    const address = new URL(url, "http://backend");
    if ((init.method ?? "GET") === "GET" && address.pathname === "/api/creatures") {
      const name = (address.searchParams.get("name") ?? "").toLowerCase();
      return new Response(JSON.stringify({ content: [goblin, ogre].filter((one) => one.name.toLowerCase().includes(name)) }), { status: 200 });
    }
    return base(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function addCreature(text) {
  const input = screen.getByRole("combobox", { name: "Creature" });
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

const difficulty = () => within(screen.getByRole("region", { name: "Difficulty" }));

describe("the party", () => {
  it("lists the user's players and their party's, all included to begin with", async () => {
    stubBackend();
    render(<EncountersPage onOpenTracker={() => {}} />);

    for (const name of ["Ana", "Bo", "Cy"]) {
      expect(await screen.findByRole("checkbox", { name: `Include ${name}` })).toBeChecked();
    }
    expect(screen.getByText("Level 3 Fighter · Dwarf")).toBeInTheDocument();
    expect(screen.getByText(/from cyrus/)).toBeInTheDocument();
  });

  it("says what to do when there are no players", async () => {
    stubBackend({ mine: [], party: [] });
    render(<EncountersPage onOpenTracker={() => {}} />);

    expect(await screen.findByText(/You have no players yet/)).toBeInTheDocument();
  });

  it("still works, without players, when they can't be loaded", async () => {
    stubBackend({ extra: { "GET /api/players": () => new Response("{}", { status: 500 }) } });
    render(<EncountersPage onOpenTracker={() => {}} />);

    expect(await screen.findByText(/Couldn't load your players/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add a character" })).toBeInTheDocument();
  });
});

describe("how hard it is", () => {
  it("asks for a party and creatures before it says", async () => {
    stubBackend();
    render(<EncountersPage onOpenTracker={() => {}} />);

    expect(await screen.findByText("Add a party and creatures")).toBeInTheDocument();
  });

  it("measures the creatures against the party's XP budget by the 2024 rules, which the players use", async () => {
    stubBackend();
    render(<EncountersPage onOpenTracker={() => {}} />);
    await screen.findByRole("checkbox", { name: "Include Ana" });

    await addCreature("Goblin");

    // three level 3 characters: 450 low, 675 moderate, 1,200 high
    await waitFor(() => expect(difficulty().getByRole("status")).toHaveTextContent("Low"));
    expect(difficulty().getByText("50 XP of monsters")).toBeInTheDocument();
    expect(difficulty().getByText("675 XP")).toBeInTheDocument();

    await addCreature("Ogre");

    await waitFor(() => expect(difficulty().getByRole("status")).toHaveTextContent("Moderate"));
    expect(difficulty().getByText("500 XP of monsters")).toBeInTheDocument();
  });

  it("measures by the 2014 rules when asked: multiplied for the number of monsters", async () => {
    stubBackend();
    render(<EncountersPage onOpenTracker={() => {}} />);
    await screen.findByRole("checkbox", { name: "Include Ana" });
    await addCreature("Goblin");
    await addCreature("Ogre");

    fireEvent.click(screen.getByRole("button", { name: "2014 rules" }));

    // easy 225, medium 450, hard 675, deadly 1,200; 500 XP x 1.5 = 750
    expect(difficulty().getByText("500 XP × 1.5 for the number of monsters = 750 adjusted XP")).toBeInTheDocument();
    expect(difficulty().getByRole("status")).toHaveTextContent("Hard");
    expect(difficulty().getByText("225 XP")).toBeInTheDocument();
  });

  it("uses the rules the players are on", async () => {
    const old = (player) => ({ ...player, ruleset: "5e-2014" });
    stubBackend({ mine: [old(ana), old(bo)], party: [old(cy)] });
    render(<EncountersPage onOpenTracker={() => {}} />);

    expect(await screen.findByRole("button", { name: "2014 rules" })).toHaveAttribute("aria-pressed", "true");
  });

  it("changes when a player is left out", async () => {
    stubBackend();
    render(<EncountersPage onOpenTracker={() => {}} />);
    fireEvent.click(await screen.findByRole("checkbox", { name: "Include Cy" }));
    await addCreature("Goblin");

    // two level 3 characters: 300 low
    expect(await difficulty().findByText("300 XP")).toBeInTheDocument();
  });

  it("counts characters added by level", async () => {
    stubBackend({ mine: [], party: [] });
    render(<EncountersPage onOpenTracker={() => {}} />);
    await screen.findByText(/You have no players yet/);

    fireEvent.change(screen.getByLabelText("Level of the character to add"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Add a character" }));
    await addCreature("Ogre");

    // one level 5 character: 500 low, 750 moderate, 1,100 high; 450 XP
    await waitFor(() => expect(difficulty().getByRole("status")).toHaveTextContent("Low"));
    expect(difficulty().getByText("750 XP")).toBeInTheDocument();
    expect(screen.getByText("Level 5")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Remove the level 5 character"));
    expect(await screen.findByText("Add a party and creatures")).toBeInTheDocument();
  });
});

describe("the creatures", () => {
  it("says which attack hits hardest, for creatures whose actions say what they do", async () => {
    stubBackend();
    render(<EncountersPage onOpenTracker={() => {}} />);

    await addCreature("Goblin");

    expect(await screen.findByText("Hits hardest with Scimitar: +4 to hit, about 5 damage")).toBeInTheDocument();
  });

  it("says nothing of it for a creature with no attacks", async () => {
    stubBackend();
    render(<EncountersPage onOpenTracker={() => {}} />);

    await addCreature("Ogre");

    await screen.findByLabelText("Number of Ogre");
    expect(screen.queryByText(/Hits hardest/)).not.toBeInTheDocument();
  });

  it("adds each kind once, with its challenge rating and XP, and counts another of the same", async () => {
    stubBackend();
    render(<EncountersPage onOpenTracker={() => {}} />);
    await addCreature("Goblin");
    await addCreature("Goblin");

    const list = within(await screen.findByRole("list", { name: "Monsters" }));
    expect(list.getAllByRole("listitem")).toHaveLength(1);
    expect(list.getByLabelText("Number of Goblin")).toHaveTextContent("2");
    expect(list.getByText(/CR 1\/4 · 50 XP each · 100 XP in all/)).toBeInTheDocument();
  });

  it("changes the number, to no fewer than one, and removes a kind", async () => {
    stubBackend();
    render(<EncountersPage onOpenTracker={() => {}} />);
    await addCreature("Goblin");

    expect(await screen.findByRole("button", { name: "Fewer Goblin" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "More Goblin" }));
    fireEvent.click(screen.getByRole("button", { name: "More Goblin" }));
    expect(screen.getByLabelText("Number of Goblin")).toHaveTextContent("3");
    fireEvent.click(screen.getByRole("button", { name: "Fewer Goblin" }));
    expect(screen.getByLabelText("Number of Goblin")).toHaveTextContent("2");

    fireEvent.click(screen.getByRole("button", { name: "Remove Goblin" }));
    expect(screen.getByText("Search for creatures to add to the encounter.")).toBeInTheDocument();
  });

  it("shows a creature's stat block", async () => {
    stubBackend();
    render(<EncountersPage onOpenTracker={() => {}} />);
    await addCreature("Ogre");

    fireEvent.click(await screen.findByRole("button", { name: "Stat block of Ogre" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});

describe("adding to the initiative tracker", () => {
  const trackerRoutes = (saved = { version: 1, combatants: [] }) => ({
    "GET /api/me/tracker": saved,
    "PUT /api/me/tracker": {},
  });

  it("can't until there are creatures", async () => {
    stubBackend({ extra: trackerRoutes() });
    render(<EncountersPage onOpenTracker={() => {}} />);

    expect(await screen.findByRole("button", { name: "Add to initiative tracker" })).toBeDisabled();
  });

  it("puts the monsters, numbered, and the ticked players in the tracker with rolled initiative, then opens it", async () => {
    const fetchMock = stubBackend({ extra: trackerRoutes() });
    const opened = vi.fn();
    render(<EncountersPage onOpenTracker={opened} />);
    await screen.findByRole("checkbox", { name: "Include Ana" });
    fireEvent.click(screen.getByRole("checkbox", { name: "Include Cy" })); // left out
    await addCreature("Goblin");
    fireEvent.click(await screen.findByRole("button", { name: "More Goblin" }));

    fireEvent.click(screen.getByRole("button", { name: "Add to initiative tracker" }));

    await waitFor(() => expect(opened).toHaveBeenCalledTimes(1));
    const [saved] = bodiesSentTo(fetchMock, "PUT /api/me/tracker");
    // every d20 is 11: goblins 13 (+2), Bo 14 (+3), Ana 12 (+1); the highest goes first
    expect(saved.combatants.map((one) => [one.name, one.initiative])).toEqual([
      ["Bo", 14],
      ["Goblin 1", 13],
      ["Goblin 2", 13],
      ["Ana", 12],
    ]);
    expect(saved.combatants.find((one) => one.name === "Goblin 1")).toMatchObject({ type: "Creature", creatureKey: "srd_goblin", ac: 15, hp: 7 });
    expect(saved.combatants.find((one) => one.name === "Ana")).toMatchObject({ type: "PC", playerId: 1, ac: 18, hp: 30 });
    expect(saved.combatants.map((one) => one.id)).toEqual([1, 2, 3, 4]);
  });

  it("leaves the players out when told to", async () => {
    const fetchMock = stubBackend({ extra: trackerRoutes() });
    render(<EncountersPage onOpenTracker={() => {}} />);
    await screen.findByRole("checkbox", { name: "Include Ana" });
    await addCreature("Ogre");

    fireEvent.click(await screen.findByRole("checkbox", { name: "Include the ticked players" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to initiative tracker" }));

    await waitFor(() => expect(bodiesSentTo(fetchMock, "PUT /api/me/tracker")).toHaveLength(1));
    expect(bodiesSentTo(fetchMock, "PUT /api/me/tracker")[0].combatants.map((one) => one.name)).toEqual(["Ogre"]);
  });

  it("goes after whoever is already in the tracker", async () => {
    const waiting = { id: 9, initiative: 20, name: "Zed", ac: 10, hp: 5, reaction: false, type: "NPC", creatureKey: null };
    const fetchMock = stubBackend({ extra: trackerRoutes({ version: 1, combatants: [waiting] }) });
    render(<EncountersPage onOpenTracker={() => {}} />);
    await addCreature("Ogre");

    fireEvent.click(await screen.findByRole("checkbox", { name: "Include the ticked players" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to initiative tracker" }));

    await waitFor(() => expect(bodiesSentTo(fetchMock, "PUT /api/me/tracker")).toHaveLength(1));
    const { combatants } = bodiesSentTo(fetchMock, "PUT /api/me/tracker")[0];
    expect(combatants.map((one) => [one.id, one.name])).toEqual([[9, "Zed"], [10, "Ogre"]]);
  });

  it("says why it couldn't, and stays", async () => {
    stubBackend({ extra: { "GET /api/me/tracker": () => new Response(JSON.stringify({ detail: "tracker is down" }), { status: 500 }) } });
    const opened = vi.fn();
    render(<EncountersPage onOpenTracker={opened} />);
    await addCreature("Ogre");

    fireEvent.click(await screen.findByRole("button", { name: "Add to initiative tracker" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't add them to the tracker");
    expect(opened).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Add to initiative tracker" })).toBeEnabled();
  });
});

describe("saved encounters", () => {
  const ambush = {
    id: 4,
    name: "Goblin ambush",
    ruleset: "5e-2014",
    players: [1],
    extras: [5, 5],
    monsters: [{ key: "srd_goblin", name: "Goblin", count: 3 }, { key: "srd_ogre", name: "Ogre", count: 1 }],
    savedAt: "2026-10-10T12:00:00.000Z",
  };
  const withSaved = (...encounters) => ({
    "GET /api/me/encounters": { version: 1, encounters },
    "PUT /api/me/encounters": {},
    "GET /api/creatures/srd_goblin": goblin,
    "GET /api/creatures/srd_ogre": ogre,
  });
  const saved = () => within(screen.getByRole("region", { name: "Saved encounters" }));

  it("lists what is saved, with what is in each", async () => {
    stubBackend({ extra: withSaved(ambush) });
    render(<EncountersPage onOpenTracker={() => {}} />);

    const list = within(await screen.findByRole("list", { name: "Saved" }));
    expect(list.getByText("Goblin ambush")).toBeInTheDocument();
    expect(list.getByText("3 Goblin, 1 Ogre · 3 characters")).toBeInTheDocument();
  });

  it("says nothing is saved yet", async () => {
    stubBackend({ extra: withSaved() });
    render(<EncountersPage onOpenTracker={() => {}} />);

    expect(await screen.findByText(/Nothing saved yet/)).toBeInTheDocument();
  });

  it("can't save without creatures or a name", async () => {
    stubBackend({ extra: withSaved() });
    render(<EncountersPage onOpenTracker={() => {}} />);
    await screen.findByText(/Nothing saved yet/);

    expect(saved().getByRole("button", { name: "Save" })).toBeDisabled();
    await addCreature("Goblin");
    expect(saved().getByRole("button", { name: "Save" })).toBeDisabled(); // no name
    fireEvent.change(screen.getByLabelText("Encounter name"), { target: { value: "  " } });
    expect(saved().getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Encounter name"), { target: { value: "Ambush" } });
    expect(saved().getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("saves the encounter under its name: the creatures by key, the ticked players and the characters by level", async () => {
    const fetchMock = stubBackend({ extra: withSaved() });
    render(<EncountersPage onOpenTracker={() => {}} />);
    await screen.findByRole("checkbox", { name: "Include Ana" });
    fireEvent.click(screen.getByRole("checkbox", { name: "Include Cy" })); // left out
    fireEvent.change(screen.getByLabelText("Level of the character to add"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Add a character" }));
    await addCreature("Goblin");
    fireEvent.click(await screen.findByRole("button", { name: "More Goblin" }));
    fireEvent.click(screen.getByRole("button", { name: "2014 rules" }));
    fireEvent.change(screen.getByLabelText("Encounter name"), { target: { value: " Goblin ambush " } });

    fireEvent.click(saved().getByRole("button", { name: "Save" }));

    expect(await screen.findByText('Saved "Goblin ambush".')).toBeInTheDocument();
    const [body] = bodiesSentTo(fetchMock, "PUT /api/me/encounters");
    expect(body.version).toBe(1);
    expect(body.encounters).toHaveLength(1);
    expect(body.encounters[0]).toMatchObject({
      id: 1,
      name: "Goblin ambush",
      ruleset: "5e-2014",
      players: [1, 2],
      extras: [5],
      monsters: [{ key: "srd_goblin", name: "Goblin", count: 2 }],
    });
    expect(body.encounters[0].monsters[0]).not.toHaveProperty("creature");
    expect(within(await screen.findByRole("list", { name: "Saved" })).getByText("Goblin ambush")).toBeInTheDocument();
  });

  it("replaces the encounter with the same name, and says it will", async () => {
    const fetchMock = stubBackend({ extra: withSaved(ambush) });
    render(<EncountersPage onOpenTracker={() => {}} />);
    await screen.findByRole("list", { name: "Saved" });
    await addCreature("Ogre");
    fireEvent.change(screen.getByLabelText("Encounter name"), { target: { value: "goblin AMBUSH" } });

    expect(saved().getByText("Saving replaces the encounter with this name.")).toBeInTheDocument();
    fireEvent.click(saved().getByRole("button", { name: "Replace" }));

    await screen.findByText(/Saved "goblin AMBUSH"/);
    const [body] = bodiesSentTo(fetchMock, "PUT /api/me/encounters");
    expect(body.encounters).toHaveLength(1);
    expect(body.encounters[0]).toMatchObject({ id: 4, monsters: [{ key: "srd_ogre", name: "Ogre", count: 1 }] });
  });

  it("builds a saved encounter again: its creatures, party and rules, as the creatures are now", async () => {
    stubBackend({ extra: withSaved(ambush) });
    render(<EncountersPage onOpenTracker={() => {}} />);
    await screen.findByRole("checkbox", { name: "Include Ana" });

    fireEvent.click(await screen.findByRole("button", { name: "Load Goblin ambush" }));

    expect(await screen.findByText('Loaded "Goblin ambush".')).toBeInTheDocument();
    expect(screen.getByLabelText("Number of Goblin")).toHaveTextContent("3");
    expect(screen.getByLabelText("Number of Ogre")).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "2014 rules" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("checkbox", { name: "Include Ana" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Include Bo" })).not.toBeChecked();
    expect(screen.getAllByText("Level 5")).toHaveLength(2);
    expect(screen.getByLabelText("Encounter name")).toHaveValue("Goblin ambush");
    // 2 + 1 characters: the players' levels and two level 5 extras make four
    expect(difficulty().getByText(/for the number of monsters/)).toBeInTheDocument();
  });

  it("leaves out a creature that can't be found, and says so", async () => {
    stubBackend({ extra: { ...withSaved(ambush), "GET /api/creatures/srd_ogre": () => new Response("{}", { status: 404 }) } });
    render(<EncountersPage onOpenTracker={() => {}} />);

    fireEvent.click(await screen.findByRole("button", { name: "Load Goblin ambush" }));

    expect(await screen.findByText('Loaded "Goblin ambush", but 1 creature couldn\'t be found.')).toBeInTheDocument();
    expect(screen.getByLabelText("Number of Goblin")).toHaveTextContent("3");
    expect(screen.queryByLabelText("Number of Ogre")).not.toBeInTheDocument();
  });

  it("deletes a saved encounter, leaving the others", async () => {
    const other = { ...ambush, id: 5, name: "Zombies" };
    const fetchMock = stubBackend({ extra: withSaved(ambush, other) });
    render(<EncountersPage onOpenTracker={() => {}} />);

    fireEvent.click(await screen.findByRole("button", { name: "Delete Goblin ambush" }));

    await waitFor(() => expect(bodiesSentTo(fetchMock, "PUT /api/me/encounters")).toHaveLength(1));
    expect(bodiesSentTo(fetchMock, "PUT /api/me/encounters")[0].encounters.map((one) => one.name)).toEqual(["Zombies"]);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Delete Goblin ambush" })).not.toBeInTheDocument());
  });

  it("changes what the account has now, not what was loaded, so another tab's save isn't lost", async () => {
    let calls = 0;
    const fetchMock = stubBackend({
      extra: {
        ...withSaved(),
        // the account has one more by the time of the save
        "GET /api/me/encounters": () => ({ version: 1, encounters: ++calls === 1 ? [] : [{ ...ambush, id: 9, name: "From another tab" }] }),
      },
    });
    render(<EncountersPage onOpenTracker={() => {}} />);
    await screen.findByText(/Nothing saved yet/);
    await addCreature("Ogre");
    fireEvent.change(screen.getByLabelText("Encounter name"), { target: { value: "Mine" } });

    fireEvent.click(saved().getByRole("button", { name: "Save" }));

    await screen.findByText('Saved "Mine".');
    expect(bodiesSentTo(fetchMock, "PUT /api/me/encounters")[0].encounters.map((one) => one.name)).toEqual(["From another tab", "Mine"]);
  });

  it("says why it couldn't be saved, and stays", async () => {
    stubBackend({ extra: { ...withSaved(), "PUT /api/me/encounters": () => new Response(JSON.stringify({ detail: "too big" }), { status: 413 }) } });
    render(<EncountersPage onOpenTracker={() => {}} />);
    await screen.findByText(/Nothing saved yet/);
    await addCreature("Ogre");
    fireEvent.change(screen.getByLabelText("Encounter name"), { target: { value: "Mine" } });

    fireEvent.click(saved().getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save the encounter");
    expect(saved().getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("still builds encounters when the saved ones can't be loaded", async () => {
    stubBackend({ extra: { "GET /api/me/encounters": () => new Response("{}", { status: 500 }) } });
    render(<EncountersPage onOpenTracker={() => {}} />);

    expect(await screen.findByText("Couldn't load your saved encounters.")).toBeInTheDocument();
    await addCreature("Ogre");
    expect(await screen.findByLabelText("Number of Ogre")).toBeInTheDocument();
  });
});
