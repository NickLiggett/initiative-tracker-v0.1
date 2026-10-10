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
  const base = stubApi({ "GET /api/players": mine, "GET /api/party/players": party, ...extra });
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
