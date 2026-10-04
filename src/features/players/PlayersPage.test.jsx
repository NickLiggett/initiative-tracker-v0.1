import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { bodiesSentTo, stubApi } from "../../test/fakeApi";
import PlayersPage from "./PlayersPage";

afterEach(() => vi.unstubAllGlobals());

const thorin = {
  id: 1,
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
};
const borrowed = {
  id: 2,
  name: "Pip",
  ruleset: "5e-2024",
  classKey: null,
  className: "Rogue",
  speciesKey: null,
  speciesName: null,
  level: 3,
  armorClass: 15,
  hitPoints: 21,
  initiativeBonus: 4,
  notes: null,
  owner: "gm",
  playedBy: "dev",
  role: "PLAYER",
};

const item = (key, name, system) => ({ key, name, document: { gamesystem: { key: system } } });
const REFERENCE = {
  "GET /api/classes": {
    content: [
      item("srd_fighter", "Fighter", "5e-2014"),
      item("srd_wizard", "Wizard", "5e-2014"),
      item("srd-2024_wizard", "Wizard", "5e-2024"),
      item("srd-2024_barbarian", "Barbarian", "5e-2024"),
    ],
  },
  "GET /api/species": { content: [item("srd_dwarf", "Dwarf", "5e-2014"), item("srd-2024_goliath", "Goliath", "5e-2024")] },
};

async function renderPage(routes = {}, players = [thorin, borrowed]) {
  const fetchMock = stubApi({ "GET /api/players": players, ...REFERENCE, ...routes });
  render(<PlayersPage />);
  await screen.findByRole("heading", { name: "Players" });
  if (players.length) {
    await screen.findByRole("list", { name: "Your players" });
  }
  return fetchMock;
}

const card = (name) => within(screen.getByRole("group", { name }));
const field = (label) => screen.getByLabelText(label);
const type = (label, value) => fireEvent.change(field(label), { target: { value } });
const openNew = () => fireEvent.click(screen.getByRole("button", { name: "New player" }));
/** Waits for the editor's lists of classes and species to arrive, which they do a moment after it opens. */
const listsLoaded = async () => {
  const input = field("Class"); // (while the list is open, the list has the label too)
  fireEvent.mouseDown(input);
  await screen.findByRole("option", { name: "Barbarian" });
  fireEvent.blur(input);
  await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
};

describe("the list", () => {
  it("shows each player with their numbers and who made or plays them", async () => {
    await renderPage();

    const mine = card("Thorin");
    expect(mine.getByText("Level 5 Fighter · Dwarf")).toBeInTheDocument();
    expect(mine.getByText("2014 rules")).toBeInTheDocument();
    expect(mine.getByText("18")).toBeInTheDocument();
    expect(mine.getByText("52")).toBeInTheDocument();
    expect(mine.getByText("+1")).toBeInTheDocument();
    expect(mine.getByText("Carries a grudge")).toBeInTheDocument();
    expect(mine.getByText("Played by anna")).toBeInTheDocument();
    expect(mine.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(mine.getByRole("button", { name: "Duplicate" })).toBeInTheDocument();
    expect(mine.getByRole("button", { name: "Delete" })).toBeInTheDocument();

    const played = card("Pip");
    expect(played.getByText("2024 rules")).toBeInTheDocument();
    expect(played.getByText("Made by gm. You play this one.")).toBeInTheDocument();
    expect(played.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(played.queryByRole("button", { name: "Duplicate" })).not.toBeInTheDocument();
    expect(played.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("says when there are none", async () => {
    await renderPage({}, []);

    expect(screen.getByText("You don't have any players yet. Make one with New player.")).toBeInTheDocument();
  });

  it("says when it can't load, and when nobody is signed in", async () => {
    stubApi({ "GET /api/players": () => new Response("{}", { status: 500 }) });
    const { unmount } = render(<PlayersPage />);
    expect(await screen.findByText("Couldn't load your players. Is the backend running?")).toBeInTheDocument();
    unmount();

    stubApi({ "GET /api/players": () => new Response(JSON.stringify({ detail: "Sign in" }), { status: 401 }) });
    render(<PlayersPage />);
    expect(await screen.findByText("Sign in to keep players.")).toBeInTheDocument();
  });
});

describe("making a player", () => {
  it("saves what was filled in, with the class and species from the rules chosen", async () => {
    const fetchMock = await renderPage({
      "POST /api/players": (body) => ({ ...thorin, ...body, id: 9, owner: "dev", role: "OWNER" }),
    });

    openNew();
    await listsLoaded();
    type("Name", "Aria");
    fireEvent.click(screen.getByRole("button", { name: "2014 rules" }));
    type("Class", "wizard");
    type("Species", "Dwarf");
    type("Level", "4");
    type("Armor class", "13");
    type("Hit points", "22");
    type("Initiative bonus", "+2");
    type("Notes", "Studies hard");
    type("Played by (username)", "@Anna");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument());
    expect(bodiesSentTo(fetchMock, "POST /api/players")).toEqual([
      {
        name: "Aria",
        ruleset: "5e-2014",
        classKey: "srd_wizard",
        className: "wizard",
        speciesKey: "srd_dwarf",
        speciesName: "Dwarf",
        level: 4,
        armorClass: 13,
        hitPoints: 22,
        initiativeBonus: 2,
        notes: "Studies hard",
        playedBy: "anna",
      },
    ]);
    expect(card("Aria").getByText("Level 4 wizard · Dwarf")).toBeInTheDocument();
  });

  it("starts on the 2024 rules and offers only that rule set's classes", async () => {
    await renderPage();
    openNew();

    expect(screen.getByRole("button", { name: "2024 rules" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.mouseDown(field("Class"));
    expect(await screen.findByRole("option", { name: "Barbarian" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Fighter" })).not.toBeInTheDocument();
  });

  it("looks the class up again when the rules change, since the same name is another class under other rules", async () => {
    const fetchMock = await renderPage({ "POST /api/players": (body) => ({ ...thorin, ...body, id: 9 }) });
    openNew();
    await listsLoaded();
    type("Name", "Aria");
    type("Class", "Wizard");

    fireEvent.click(screen.getByRole("button", { name: "2014 rules" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST /api/players")).toHaveLength(1));
    expect(bodiesSentTo(fetchMock, "POST /api/players")[0]).toMatchObject({ ruleset: "5e-2014", classKey: "srd_wizard" });
  });

  it("keeps a typed class that isn't in the list, without a key", async () => {
    const fetchMock = await renderPage({ "POST /api/players": (body) => ({ ...thorin, ...body, id: 9 }) });
    openNew();
    type("Name", "Aria");
    type("Class", "Blood Hunter");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST /api/players")).toHaveLength(1));
    expect(bodiesSentTo(fetchMock, "POST /api/players")[0]).toMatchObject({ className: "Blood Hunter", classKey: null });
  });

  it("can't be saved until it is fixed, and says what is wrong", async () => {
    await renderPage();
    openNew();

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Give the player a name.");

    type("Name", "Aria");
    type("Level", "30");
    expect(screen.getByRole("status")).toHaveTextContent("Level must be 1 to 20.");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    type("Level", "3");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("shows a preview as it's filled in", async () => {
    await renderPage();
    openNew();

    type("Name", "Aria");
    type("Armor class", "16");

    const preview = within(screen.getByLabelText("Preview"));
    expect(preview.getByRole("group", { name: "Aria" })).toBeInTheDocument();
    expect(preview.getByText("16")).toBeInTheDocument();
  });

  it("says what to do when the player named has no account", async () => {
    await renderPage({
      "POST /api/players": () => new Response(JSON.stringify({ detail: "No user 'ghost'" }), { status: 404 }),
    });
    openNew();
    type("Name", "Aria");
    type("Played by (username)", "ghost");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("There's no user called ghost.");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(); // still there, to fix
  });

  it("goes back to the list on Cancel, saving nothing", async () => {
    const fetchMock = await renderPage();
    openNew();
    type("Name", "Aria");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByRole("list", { name: "Your players" })).toBeInTheDocument();
    expect(bodiesSentTo(fetchMock, "POST /api/players")).toEqual([]);
  });
});

describe("changing a player", () => {
  it("starts from the player, and replaces it", async () => {
    const fetchMock = await renderPage({ "PUT /api/players/1": (body) => ({ ...thorin, ...body }) });

    fireEvent.click(card("Thorin").getByRole("button", { name: "Edit" }));
    expect(field("Name")).toHaveValue("Thorin");
    expect(field("Class")).toHaveValue("Fighter");
    expect(field("Level")).toHaveValue("5");
    expect(screen.getByRole("button", { name: "2014 rules" })).toHaveAttribute("aria-pressed", "true");
    type("Level", "6");
    type("Hit points", "60");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(card("Thorin").getByText("Level 6 Fighter · Dwarf")).toBeInTheDocument());
    expect(bodiesSentTo(fetchMock, "PUT /api/players/1")[0]).toMatchObject({ name: "Thorin", level: 6, hitPoints: 60, classKey: "srd_fighter", playedBy: "anna" });
    expect(card("Thorin").getByText("60")).toBeInTheDocument();
  });

  it("lets whoever only plays a player change its numbers, and nothing else", async () => {
    const fetchMock = await renderPage({ "PUT /api/players/2": (body) => ({ ...borrowed, ...body }) });

    fireEvent.click(card("Pip").getByRole("button", { name: "Edit" }));

    expect(screen.getByText(/gm made this player/)).toBeInTheDocument();
    expect(field("Name")).toBeDisabled();
    expect(field("Class")).toBeDisabled();
    expect(field("Species")).toBeDisabled();
    expect(field("Played by (username)")).toBeDisabled();
    expect(screen.getByRole("button", { name: "2014 rules" })).toBeDisabled();
    expect(field("Level")).toBeEnabled();
    expect(field("Hit points")).toBeEnabled();
    expect(field("Notes")).toBeEnabled();

    type("Hit points", "30");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(card("Pip").getByText("30")).toBeInTheDocument());
    expect(bodiesSentTo(fetchMock, "PUT /api/players/2")[0]).toMatchObject({ name: "Pip", ruleset: "5e-2024", className: "Rogue", hitPoints: 30, playedBy: "dev" });
  });
});

describe("duplicating a player", () => {
  it("starts a new player like it, named as a copy and played by nobody", async () => {
    const fetchMock = await renderPage({ "POST /api/players": (body) => ({ ...thorin, ...body, id: 10 }) });

    fireEvent.click(card("Thorin").getByRole("button", { name: "Duplicate" }));

    expect(screen.getByRole("heading", { name: "New player" })).toBeInTheDocument();
    expect(field("Name")).toHaveValue("Thorin (copy)");
    expect(field("Played by (username)")).toHaveValue("");
    expect(field("Level")).toHaveValue("5");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(card("Thorin (copy)").getByText("Level 5 Fighter · Dwarf")).toBeInTheDocument());
    expect(bodiesSentTo(fetchMock, "POST /api/players")[0]).toMatchObject({ name: "Thorin (copy)", playedBy: null, armorClass: 18 });
    expect(card("Thorin")).toBeTruthy(); // the original is still there
  });
});

describe("deleting a player", () => {
  it("asks first, and then deletes it", async () => {
    const fetchMock = await renderPage({ "DELETE /api/players/1": null });

    fireEvent.click(card("Thorin").getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete Thorin?")).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("group", { name: "Thorin" })).not.toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Pip" })).toBeInTheDocument();
  });

  it("keeps it, and says why, when that fails", async () => {
    await renderPage({ "DELETE /api/players/1": () => new Response(JSON.stringify({ detail: "Only dev can delete this player" }), { status: 403 }) });

    fireEvent.click(card("Thorin").getByRole("button", { name: "Delete" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Couldn't delete Thorin: Only dev can delete this player")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("group", { name: "Thorin" })).toBeInTheDocument();
  });
});
