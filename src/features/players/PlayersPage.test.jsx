import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { bodiesSentTo, stubApi } from "../../test/fakeApi";
import { SettingsProvider } from "../../settings/SettingsContext";
import { DEFAULT_SETTINGS, cacheSettings, rememberUser } from "../../settings/settings";
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
  "GET /api/species": {
    content: [
      item("srd_dwarf", "Dwarf", "5e-2014"),
      item("srd-2024_goliath", "Goliath", "5e-2024"),
      { key: "mine_aasimar", name: "Aasimar", document: { gamesystem: null } }, // a user's own
    ],
  },
};

async function renderPage(routes = {}, players = [thorin, borrowed]) {
  const fetchMock = stubApi({ "GET /api/players": players, ...REFERENCE, ...routes });
  render(<PlayersPage />);
  await screen.findByRole("heading", { name: "Characters" });
  if (players.length) {
    await screen.findByRole("list", { name: "Your characters" });
  }
  return fetchMock;
}

const card = (name) => within(screen.getByRole("group", { name }));
const field = (label) => screen.getByLabelText(label);
const type = (label, value) => fireEvent.change(field(label), { target: { value } });
const openNew = () => fireEvent.click(screen.getByRole("button", { name: "New character" }));
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
    expect(mine.getByRole("button", { name: "Open sheet" })).toBeInTheDocument();
    for (const name of ["Edit", "Inventory", "Hit points"]) {
      expect(mine.queryByRole("button", { name })).not.toBeInTheDocument(); // all of that is on the sheet
    }
    expect(mine.getByRole("button", { name: "Duplicate" })).toBeInTheDocument();
    expect(mine.getByRole("button", { name: "Delete" })).toBeInTheDocument();

    const played = card("Pip");
    expect(played.getByText("2024 rules")).toBeInTheDocument();
    expect(played.getByText("Made by gm. You play this one.")).toBeInTheDocument();
    expect(played.getByRole("button", { name: "Open sheet" })).toBeInTheDocument();
    expect(played.queryByRole("button", { name: "Duplicate" })).not.toBeInTheDocument();
    expect(played.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("says when there are none", async () => {
    await renderPage({}, []);

    expect(screen.getByText("You don't have any characters yet. Make one with New character.")).toBeInTheDocument();
  });

  it("says when it can't load, and when nobody is signed in", async () => {
    stubApi({ "GET /api/players": () => new Response("{}", { status: 500 }) });
    const { unmount } = render(<PlayersPage />);
    expect(await screen.findByText("Couldn't load your characters. Is the backend running?")).toBeInTheDocument();
    unmount();

    stubApi({ "GET /api/players": () => new Response(JSON.stringify({ detail: "Sign in" }), { status: 401 }) });
    render(<PlayersPage />);
    expect(await screen.findByText("Sign in to keep characters.")).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument());
    expect(bodiesSentTo(fetchMock, "POST /api/players")).toEqual([
      {
        name: "Aria",
        ruleset: "5e-2014",
        classKey: "srd_wizard",
        className: "wizard",
        classes: [{ classKey: "srd_wizard", className: "wizard", level: 4 }],
        speciesKey: "srd_dwarf",
        speciesName: "Dwarf",
        level: 4,
        armorClass: 13,
        hitPoints: 22,
        initiativeBonus: 2,
        notes: "Studies hard",
        playedBy: null,
      },
    ]);
    expect(card("Aria").getByText("Level 4 wizard · Dwarf")).toBeInTheDocument();
  });

  it("starts on the 2024 rules and offers that rule set's classes first, then the others'", async () => {
    await renderPage();
    openNew();

    expect(screen.getByRole("button", { name: "2024 rules" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.mouseDown(field("Class"));
    expect(await screen.findByRole("option", { name: "Barbarian" })).toBeInTheDocument();
    const names = screen.getAllByRole("option").map((option) => option.textContent);
    expect(names).toEqual(["Barbarian", "Wizard", "Fighter", "Wizard"]); // 2024's, then 2014's
  });

  it("offers species from every source the user can see, such as their own", async () => {
    await renderPage();
    openNew();

    fireEvent.mouseDown(field("Species"));

    expect(await screen.findByRole("option", { name: "Aasimar" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Dwarf" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Goliath" })).toBeInTheDocument();
  });

  it("says so when the species list can't be loaded, and still lets a name be typed", async () => {
    const fetchMock = await renderPage({
      "GET /api/species": () => new Response("{}", { status: 500 }),
      "POST /api/players": (body) => ({ ...thorin, ...body, id: 9 }),
    });
    openNew();

    expect(await screen.findByText(/Couldn't load the list of species/)).toBeInTheDocument();
    type("Name", "Aria");
    type("Species", "Aasimar");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST /api/players")).toHaveLength(1));
    expect(bodiesSentTo(fetchMock, "POST /api/players")[0]).toMatchObject({ speciesName: "Aasimar", speciesKey: null });
  });

  it("saves several classes, each with its level, and the levels added up", async () => {
    const fetchMock = await renderPage({ "POST /api/players": (body) => ({ ...thorin, ...body, id: 9 }) });
    openNew();
    await listsLoaded();
    type("Name", "Mix");
    type("Class", "Barbarian");
    type("Level", "3");
    fireEvent.click(screen.getByRole("button", { name: "Add a class" }));
    type("Class 2", "Blood Hunter");
    type("Level 2", "2");

    expect(screen.getByText("Level 5 in all.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST /api/players")).toHaveLength(1));
    expect(bodiesSentTo(fetchMock, "POST /api/players")[0]).toMatchObject({
      level: 5,
      className: "Barbarian",
      classKey: "srd-2024_barbarian",
      classes: [
        { classKey: "srd-2024_barbarian", className: "Barbarian", level: 3 },
        { classKey: null, className: "Blood Hunter", level: 2 },
      ],
    });
  });

  it("can't be saved with more than 20 levels, or a class twice, and a class can be removed", async () => {
    await renderPage();
    openNew();
    type("Name", "Mix");
    type("Class", "Fighter");
    type("Level", "15");
    fireEvent.click(screen.getByRole("button", { name: "Add a class" }));
    type("Class 2", "Wizard");
    type("Level 2", "9");

    expect(screen.getByRole("status")).toHaveTextContent("The levels add up to 24; 20 is the most.");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    type("Class 2", "fighter");
    expect(screen.getByRole("status")).toHaveTextContent("Fighter is listed twice");

    fireEvent.click(screen.getByRole("button", { name: "Remove class 2" }));
    expect(screen.queryByLabelText("Class 2")).not.toBeInTheDocument();
    type("Level", "15");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
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
    expect(screen.getByRole("status")).toHaveTextContent("Give the character a name.");

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

  it("shows what the backend refuses, and keeps the form to fix", async () => {
    await renderPage({
      "POST /api/players": () => new Response(JSON.stringify({ detail: "You can't assign anna as the player" }), { status: 400 }),
    });
    openNew();
    type("Name", "Aria");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("You can't assign anna as the player");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled(); // still there, to fix
  });

  it("goes back to the list on Cancel, saving nothing", async () => {
    const fetchMock = await renderPage();
    openNew();
    type("Name", "Aria");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByRole("list", { name: "Your characters" })).toBeInTheDocument();
    expect(bodiesSentTo(fetchMock, "POST /api/players")).toEqual([]);
  });
});

describe("duplicating a player", () => {
  it("starts a new player like it, named as a copy and played by nobody", async () => {
    const fetchMock = await renderPage({ "POST /api/players": (body) => ({ ...thorin, ...body, id: 10 }) });

    fireEvent.click(card("Thorin").getByRole("button", { name: "Duplicate" }));

    expect(screen.getByRole("heading", { name: "New Character Creation" })).toBeInTheDocument();
    expect(field("Name")).toHaveValue("Thorin (copy)");
    expect(screen.getByText("Nobody plays this character yet.")).toBeInTheDocument();
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

describe("playing your own character", () => {
  it("fills in the user's own username with one click, and saves it", async () => {
    cacheSettings("dev", { ...DEFAULT_SETTINGS });
    rememberUser("dev");
    const fetchMock = stubApi({
      "GET /api/players": [],
      "GET /api/me": { id: 1, username: "dev" },
      "GET /api/me/settings": { avatarVersion: null },
      "POST /api/players": (body) => ({ ...thorin, ...body, id: 9, owner: "dev", role: "OWNER" }),
      ...REFERENCE,
    });
    render(
      <SettingsProvider>
        <PlayersPage />
      </SettingsProvider>,
    );
    await screen.findByRole("heading", { name: "Characters" });
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url === "/api/me/settings")).toBe(true));
    await act(async () => {});

    openNew();
    type("Name", "Me");
    expect(screen.getByText("Nobody plays this character yet.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Assign to me" }));

    expect(screen.getByText("Played by dev.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assign to me" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(bodiesSentTo(fetchMock, "POST /api/players")).toHaveLength(1));
    expect(bodiesSentTo(fetchMock, "POST /api/players")[0]).toMatchObject({ name: "Me", playedBy: "dev" });
  });
});

describe("hit points and conditions on the card", () => {
  const hurt = {
    ...thorin,
    version: 3,
    vitals: { currentHp: 12, tempHp: 5, heroicInspiration: true, conditions: ["Poisoned"], exhaustion: 2, deathSaveSuccesses: 0, deathSaveFailures: 0 },
  };

  it("shows the bar, the conditions with exhaustion, and inspiration", async () => {
    await renderPage({}, [hurt]);

    expect(card("Thorin").getByRole("progressbar", { name: "Hit points 12 of 52, 5 temporary" })).toBeInTheDocument();
    expect(card("Thorin").getByRole("list", { name: "Conditions" })).toHaveTextContent("PoisonedExhaustion 2");
    expect(card("Thorin").getByTitle("Heroic Inspiration")).toBeInTheDocument();
  });
});

describe("opening a sheet", () => {
  it("opens the character's sheet in a new tab", async () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    await renderPage();

    fireEvent.click(card("Thorin").getByRole("button", { name: "Open sheet" }));

    expect(open).toHaveBeenCalledWith(expect.stringContaining("?sheet=1"), "_blank");
  });
});

describe("the name on a card", () => {
  it("opens the sheet too", async () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    await renderPage();

    fireEvent.click(card("Thorin").getByRole("button", { name: "Thorin" }));

    expect(open).toHaveBeenCalledWith(expect.stringContaining("?sheet=1"), "_blank");
  });
});

describe("coming back from a sheet", () => {
  it("shows what changed there when the tab is focused again", async () => {
    const fetchMock = await renderPage({}, [thorin]);
    const changed = { ...thorin, level: 6 };
    fetchMock.mockClear();
    stubApi({ "GET /api/players": [changed], ...REFERENCE });

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    expect(await screen.findByText("Level 6 Fighter · Dwarf")).toBeInTheDocument();
  });
});

describe("after making a character", () => {
  it("offers to open its sheet, which opens in a new tab", async () => {
    const open = vi.fn();
    vi.stubGlobal("open", open);
    await renderPage({ "POST /api/players": (body) => ({ ...thorin, ...body, id: 9, owner: "dev", role: "OWNER" }) });

    openNew();
    await listsLoaded();
    type("Name", "Aria");
    type("Class", "wizard");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    const banner = await screen.findByText(/Aria is made/);
    expect(banner).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled(); // not opened for them: a tab opened after the save is one browsers block
    fireEvent.click(screen.getByRole("button", { name: "Open Aria's sheet" }));
    expect(open).toHaveBeenCalledWith(expect.stringContaining("?sheet=9"), "_blank");
  });

  it("says nothing about a character that was only looked at, and goes when closed", async () => {
    await renderPage();

    expect(screen.queryByText(/is made/)).not.toBeInTheDocument();
  });
});

