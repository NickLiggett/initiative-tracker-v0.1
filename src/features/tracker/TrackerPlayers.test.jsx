import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { bodiesSentTo, stubApi } from "../../test/fakeApi";
import PlayerPicker from "./PlayerPicker";
import { toSavedState } from "./trackerState";
import TrackerPage from "./TrackerPage";

afterEach(() => vi.unstubAllGlobals());

const thorin = {
  id: 1, name: "Thorin", ruleset: "5e-2014", className: "Fighter", speciesName: "Dwarf", level: 5,
  armorClass: 18, hitPoints: 52, initiativeBonus: 1, notes: "Carries a grudge", owner: "dev", playedBy: null, role: "OWNER",
};
const mira = {
  id: 2, name: "Mira", ruleset: "5e-2024", className: "Wizard", speciesName: null, level: 3,
  armorClass: null, hitPoints: null, initiativeBonus: -1, notes: null, owner: "anna", playedBy: null, role: "PARTY",
};
const pip = {
  id: 3, name: "Pip", ruleset: "5e-2024", className: "Rogue", speciesName: null, level: 3,
  armorClass: 15, hitPoints: 21, initiativeBonus: 4, notes: null, owner: "gm", playedBy: "dev", role: "PLAYER",
};

const ROUTES = { "GET /api/players": [thorin, pip], "GET /api/party/players": [mira] };

const tick = (name) => fireEvent.click(screen.getByRole("checkbox", { name: `Add ${name}` }));
const initiativeOf = (name) => screen.getByLabelText(`Initiative for ${name}`);
const typeInitiative = (name, value) => fireEvent.change(initiativeOf(name), { target: { value } });

describe("PlayerPicker", () => {
  async function renderPicker(props = {}, routes = ROUTES) {
    stubApi(routes);
    const onAdd = vi.fn();
    const onClose = vi.fn();
    render(<PlayerPicker open inFight={new Set()} onAdd={onAdd} onClose={onClose} {...props} />);
    await screen.findByRole("checkbox", { name: "Add Thorin" });
    return { onAdd, onClose };
  }

  it("lists your players and your party's, with their numbers", async () => {
    await renderPicker();

    const mine = within(screen.getByRole("region", { name: "Your players" }));
    expect(mine.getByText("Thorin")).toBeInTheDocument();
    expect(mine.getByText("Level 5 Fighter · Dwarf · AC 18 · HP 52")).toBeInTheDocument();
    expect(mine.getByText("Pip")).toBeInTheDocument(); // one you play counts as yours
    const party = within(screen.getByRole("region", { name: "Your party's players" }));
    expect(party.getByText("Mira")).toBeInTheDocument();
    expect(party.getByText("Level 3 Wizard · from anna")).toBeInTheDocument();
  });

  it("adds the ticked players with the initiative given, and their numbers", async () => {
    const { onAdd } = await renderPicker();

    tick("Thorin");
    tick("Mira");
    typeInitiative("Thorin", "17");
    typeInitiative("Mira", "9");
    fireEvent.click(screen.getByRole("button", { name: "Add to initiative" }));

    expect(onAdd).toHaveBeenCalledWith([
      { initiative: 17, name: "Thorin", ac: 18, hp: 52, reaction: false, type: "PC", creature: null, playerId: 1 },
      { initiative: 9, name: "Mira", ac: "", hp: "", reaction: false, type: "PC", creature: null, playerId: 2 },
    ]);
  });

  it("shows each player's bonus, and rolls a d20 plus it", async () => {
    await renderPicker({ random: () => 0.5 }); // an 11

    tick("Thorin");
    expect(screen.getByText("+1 bonus")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Roll for Thorin" }));

    expect(initiativeOf("Thorin")).toHaveValue("12");
  });

  it("rolls for everyone ticked, and only them", async () => {
    await renderPicker({ random: () => 0 }); // a 1

    tick("Thorin");
    tick("Pip");
    fireEvent.click(screen.getByRole("button", { name: "Roll for all ticked" }));

    expect(initiativeOf("Thorin")).toHaveValue("2");
    expect(initiativeOf("Pip")).toHaveValue("5");
    expect(screen.queryByLabelText("Initiative for Mira")).not.toBeInTheDocument();
  });

  it("asks for what's missing and adds nothing", async () => {
    const { onAdd } = await renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "Add to initiative" }));
    expect(screen.getByText("Tick the players to add.")).toBeInTheDocument();
    tick("Thorin");
    fireEvent.click(screen.getByRole("button", { name: "Add to initiative" }));
    expect(screen.getByText("Give every ticked player an initiative, or roll for them.")).toBeInTheDocument();
    typeInitiative("Thorin", "abc");
    fireEvent.click(screen.getByRole("button", { name: "Add to initiative" }));

    expect(onAdd).not.toHaveBeenCalled();
  });

  it("won't add a player who is already in the order", async () => {
    await renderPicker({ inFight: new Set([1]) });

    expect(screen.getByRole("checkbox", { name: "Add Thorin" })).toBeDisabled();
    expect(screen.getByText("Already in the fight")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Add Pip" })).toBeEnabled();
  });

  it("unticking forgets the initiative", async () => {
    await renderPicker();
    tick("Thorin");
    typeInitiative("Thorin", "5");

    tick("Thorin");

    expect(screen.queryByLabelText("Initiative for Thorin")).not.toBeInTheDocument();
    tick("Thorin");
    expect(initiativeOf("Thorin")).toHaveValue("");
  });

  it("still offers your own players when the party can't be loaded", async () => {
    await renderPicker({}, { "GET /api/players": [thorin] }); // no party route: a 404

    expect(screen.getByText("Thorin")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Your party's players" })).not.toBeInTheDocument();
  });

  it("says when there are no players, and when it can't load", async () => {
    stubApi({ "GET /api/players": [], "GET /api/party/players": [] });
    const { unmount } = render(<PlayerPicker open inFight={new Set()} onAdd={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText(/You don't have any players yet/)).toBeInTheDocument();
    unmount();

    stubApi({ "GET /api/players": () => new Response("{}", { status: 500 }) });
    render(<PlayerPicker open inFight={new Set()} onAdd={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText("Couldn't load your players. Is the backend running?")).toBeInTheDocument();
  });

  it("closes on Cancel", async () => {
    const { onClose, onAdd } = await renderPicker();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalled();
    expect(onAdd).not.toHaveBeenCalled();
  });
});

describe("players in the tracker", () => {
  const goblin = { id: 1, name: "Goblin", initiative: 10, ac: 13, hp: 7, reaction: false, type: "NPC", creature: null };

  it("drops the picked players into the order, and saves them with who they are", async () => {
    const fetchMock = stubApi({
      "GET /api/me/tracker": toSavedState([goblin]),
      "PUT /api/me/tracker": (body) => body,
      ...ROUTES,
    });
    render(<TrackerPage />);
    await screen.findByText("Goblin");

    fireEvent.click(screen.getByRole("button", { name: "Players" }));
    await screen.findByRole("checkbox", { name: "Add Thorin" });
    tick("Thorin");
    typeInitiative("Thorin", "16");
    fireEvent.click(screen.getByRole("button", { name: "Add to initiative" }));

    expect(await screen.findByText("Thorin")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(bodiesSentTo(fetchMock, "PUT /api/me/tracker")).toHaveLength(1), { timeout: 3000 });
    const saved = bodiesSentTo(fetchMock, "PUT /api/me/tracker")[0].combatants;
    expect(saved.map((combatant) => combatant.name)).toEqual(["Goblin", "Thorin"]);
    expect(saved[1]).toMatchObject({ id: 2, initiative: 16, ac: 18, hp: 52, type: "PC", playerId: 1 });
  });

  it("shows a player already in the order as taken", async () => {
    stubApi({
      "GET /api/me/tracker": toSavedState([{ ...goblin, name: "Thorin", type: "PC", playerId: 1 }]),
      ...ROUTES,
    });
    render(<TrackerPage />);
    await screen.findByText("Thorin");

    fireEvent.click(screen.getByRole("button", { name: "Players" }));

    await screen.findByText("Already in the fight");
    expect(screen.getByRole("checkbox", { name: "Add Thorin" })).toBeDisabled();
  });
});
