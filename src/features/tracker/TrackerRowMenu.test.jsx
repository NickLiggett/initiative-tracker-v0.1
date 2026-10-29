import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { stubApi } from "../../test/fakeApi";
import { toSavedState } from "./trackerState";
import TrackerPage, { LONG_PRESS_MS } from "./TrackerPage";

afterEach(() => vi.unstubAllGlobals());

const goblin = { id: 1, name: "Goblin", initiative: 10, ac: 13, hp: 7, maxHp: 7, reaction: false, type: "Creature", creature: null };
const snarl = { id: 2, name: "Snarl", initiative: 7, ac: 12, hp: 9, maxHp: 9, reaction: false, type: "NPC", creature: null };
const thorin = {
  id: 1, name: "Thorin", ruleset: "5e-2014", className: "Fighter", speciesName: "Dwarf", level: 5,
  armorClass: 18, hitPoints: 52, initiativeBonus: 1, notes: null, owner: "dev", playedBy: null, role: "OWNER",
};

const puts = (fetchMock) => fetchMock.mock.calls.filter(([, init = {}]) => init.method === "PUT");
const lastSaved = (fetchMock) => JSON.parse(puts(fetchMock).at(-1)[1].body).combatants;

async function renderTracker(combatants = [goblin, snarl]) {
  const fetchMock = stubApi({
    "GET /api/me/tracker": toSavedState(combatants),
    "PUT /api/me/tracker": (body) => body,
    "GET /api/players": [thorin],
    "GET /api/party/players": [],
  });
  render(<TrackerPage />);
  await screen.findByText(combatants[0].name);
  return fetchMock;
}
const rowOf = (name) => screen.getByText(name).closest('[role="row"]');
const rightClick = (name) => fireEvent.contextMenu(rowOf(name), { clientX: 40, clientY: 60 });
const savedAfterDelay = (fetchMock) => waitFor(() => expect(puts(fetchMock).length).toBeGreaterThan(0), { timeout: 3000 });

describe("a row's menu", () => {
  it("opens on a right-click with Edit and Delete", async () => {
    await renderTracker();

    rightClick("Snarl");

    const menu = within(await screen.findByRole("menu"));
    expect(menu.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(menu.getByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
  });

  it("deletes the row it was opened on", async () => {
    const fetchMock = await renderTracker();

    rightClick("Snarl");
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByText("Snarl")).not.toBeInTheDocument());
    expect(screen.getByText("Goblin")).toBeInTheDocument();
    await savedAfterDelay(fetchMock);
    expect(lastSaved(fetchMock).map((combatant) => combatant.name)).toEqual(["Goblin"]);
  });

  it("opens on a finger held down, but not on a tap", async () => {
    await renderTracker();
    const touch = { touches: [{ clientX: 30, clientY: 30 }] };

    fireEvent.touchStart(rowOf("Snarl"), touch);
    fireEvent.touchEnd(rowOf("Snarl"));
    await new Promise((resolve) => setTimeout(resolve, LONG_PRESS_MS + 150));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.touchStart(rowOf("Snarl"), touch);
    expect(await screen.findByRole("menu", {}, { timeout: LONG_PRESS_MS + 1500 })).toBeInTheDocument();
  });
});

describe("editing a row", () => {
  async function openEditor(name) {
    rightClick(name);
    fireEvent.click(await screen.findByRole("menuitem", { name: "Edit" }));
    return within(await screen.findByRole("dialog", { name: `Edit ${name}` }));
  }

  it("changes its name, type and numbers, and saves them", async () => {
    const fetchMock = await renderTracker();
    const dialog = await openEditor("Snarl");

    fireEvent.change(dialog.getByLabelText("Name"), { target: { value: "Snarl the Wise" } });
    fireEvent.change(dialog.getByLabelText("AC"), { target: { value: "15" } });
    fireEvent.change(dialog.getByLabelText("HP"), { target: { value: "4" } });
    fireEvent.mouseDown(dialog.getByRole("combobox", { name: "Type" }));
    fireEvent.click(await screen.findByRole("option", { name: "Creature" }));
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Snarl the Wise")).toBeInTheDocument();
    await savedAfterDelay(fetchMock);
    expect(lastSaved(fetchMock)[1]).toMatchObject({ name: "Snarl the Wise", ac: 15, hp: 4, maxHp: 9, type: "Creature", initiative: 7 });
  });

  it("changes nothing until Save", async () => {
    await renderTracker();
    const dialog = await openEditor("Snarl");

    fireEvent.change(dialog.getByLabelText("Name"), { target: { value: "Someone else" } });
    fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("Snarl")).toBeInTheDocument();
    expect(screen.queryByText("Someone else")).not.toBeInTheDocument();
  });

  it("won't save without a name", async () => {
    await renderTracker();
    const dialog = await openEditor("Snarl");

    fireEvent.change(dialog.getByLabelText("Name"), { target: { value: " " } });
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("dialog", { name: "Edit Snarl" })).toBeInTheDocument();
  });

  it("gives a row legendary actions and resistances, and shows or hides what the players see", async () => {
    const fetchMock = await renderTracker();
    const dialog = await openEditor("Goblin");

    fireEvent.change(dialog.getByLabelText("Legendary actions"), { target: { value: "3" } });
    fireEvent.change(dialog.getByLabelText("Legendary resistances"), { target: { value: "2" } });
    fireEvent.click(dialog.getByRole("checkbox", { name: "Players see its AC" }));
    fireEvent.click(dialog.getByRole("checkbox", { name: "Players see its name" }));
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));

    await savedAfterDelay(fetchMock);
    expect(lastSaved(fetchMock)[0]).toMatchObject({ name: "Goblin", legendaryActions: 3, legendaryResistances: 2, acRevealed: true, hpRevealed: false, nameHidden: true });
  });

  it("makes it a character: their name, AC and HP, with the row's own initiative", async () => {
    const fetchMock = await renderTracker();
    const dialog = await openEditor("Goblin");

    fireEvent.click(dialog.getByRole("button", { name: "Make it a character…" }));
    fireEvent.click(await screen.findByRole("button", { name: "Choose Thorin" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Choose a character" })).not.toBeInTheDocument());
    fireEvent.click(dialog.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Thorin")).toBeInTheDocument();
    await savedAfterDelay(fetchMock);
    expect(lastSaved(fetchMock)[0]).toMatchObject({
      id: 1, name: "Thorin", type: "PC", playerId: 1, ac: 18, hp: 52, maxHp: 52, initiative: 10,
    });
  });
});
