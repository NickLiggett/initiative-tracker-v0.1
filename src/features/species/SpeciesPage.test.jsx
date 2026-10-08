import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { OWNERSHIP_ROUTES, bodiesSentTo, stubApi } from "../../test/fakeApi";
import SpeciesPage from "./SpeciesPage";

afterEach(() => vi.unstubAllGlobals());

const srd = {
  key: "srd-2014",
  displayName: "5e 2014 Rules",
  name: "System Reference Document 5.1",
  permalink: "https://dnd.wizards.com/resources/systems-reference-document",
  publisher: { name: "Wizards of the Coast" },
  gamesystem: { name: "5th Edition 2014" },
};
const homebrew = { key: "u1-homebrew", displayName: "dev's homebrew", name: "dev's homebrew" };

const dwarf = {
  key: "srd_dwarf",
  name: "Dwarf",
  desc: "Your dwarf character has an assortment of inborn abilities.",
  isSubspecies: false,
  subspeciesOfKey: null,
  document: srd,
  traits: [
    { name: "Ability Score Increase", desc: "**_Ability Score Increase._** Your Constitution score increases by 2.", type: null, order: null },
    { name: "Darkvision", desc: "**_Darkvision._** You can see in dim light within 60 feet of you as if it were bright light.", type: null, order: null },
  ],
};
const hillDwarf = {
  key: "srd_hill-dwarf",
  name: "Hill Dwarf",
  desc: "Hill dwarves have keen senses.",
  isSubspecies: true,
  subspeciesOfKey: "srd_dwarf",
  document: srd,
  traits: [{ name: "Dwarven Toughness", desc: "**_Dwarven Toughness._** Your hit point maximum increases by 1 per level.", type: null, order: null }],
};
const gnoll = {
  key: "u1-homebrew_gnoll",
  name: "Gnoll",
  desc: "Hyena folk.",
  isSubspecies: false,
  subspeciesOfKey: null,
  document: homebrew,
  traits: [{ name: "Keen Nose", desc: "You smell things from far away.", type: null, order: null }],
};

/** A backend whose species list answers a search the way the real one does (name, isSubspecies, subspeciesOf). */
function stubBackend(extra = {}, species = [dwarf, hillDwarf, gnoll]) {
  const base = stubApi({ ...OWNERSHIP_ROUTES, ...extra });
  const fetchMock = vi.fn(async (url, init = {}) => {
    const address = new URL(url, "http://backend");
    const read = (init.method ?? "GET") === "GET";
    if (read && address.pathname === "/api/species") {
      const name = (address.searchParams.get("name") ?? "").toLowerCase();
      const sub = address.searchParams.get("isSubspecies");
      const of = address.searchParams.get("subspeciesOf");
      const found = species.filter(
        (one) =>
          one.name.toLowerCase().includes(name) &&
          (sub === null || String(one.isSubspecies) === sub) &&
          (of === null || one.subspeciesOfKey === of),
      );
      return new Response(JSON.stringify({ content: found }), { status: 200 });
    }
    const one = read && address.pathname.startsWith("/api/species/") ? species.find((s) => `/api/species/${s.key}` === address.pathname) : null;
    if (one) {
      return new Response(JSON.stringify(one), { status: 200 });
    }
    return base(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const field = (name) => screen.getByRole("combobox", { name });

async function pick(label, text) {
  const input = field(label);
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

describe("reading a species", () => {
  it("shows its source, description and traits, without the name Open5e puts in front of each trait's text", async () => {
    stubBackend();
    render(<SpeciesPage />);

    expect(screen.getByText("Search for a species to see its traits.")).toBeInTheDocument();
    await pick("Species", "Dwarf");

    expect(await screen.findByRole("heading", { name: "Dwarf" })).toBeInTheDocument();
    expect(screen.getByText("5e 2014 Rules")).toBeInTheDocument();
    expect(screen.getByText("Wizards of the Coast · 5th Edition 2014")).toBeInTheDocument();
    expect(screen.getByText("Your dwarf character has an assortment of inborn abilities.")).toBeInTheDocument();
    expect(screen.getByText("Ability Score Increase")).toBeInTheDocument(); // once, as the trait's name
    expect(screen.getByText("Your Constitution score increases by 2.")).toBeInTheDocument();
    expect(screen.queryByText(/_Ability Score Increase\._/)).not.toBeInTheDocument();
    expect(screen.getByText("Darkvision")).toBeInTheDocument();
  });

  it("lists a species' subspecies", async () => {
    stubBackend();
    render(<SpeciesPage />);

    await pick("Species", "Dwarf");

    const subspecies = within(await screen.findByLabelText("Subspecies"));
    expect(subspecies.getByText("Hill Dwarf")).toBeInTheDocument();
  });

  it("says which species a subspecies belongs to", async () => {
    stubBackend();
    render(<SpeciesPage />);

    await pick("Species", "Hill Dwarf");

    expect(await screen.findByText("Subspecies of Dwarf")).toBeInTheDocument();
    expect(screen.getByText("Dwarven Toughness")).toBeInTheDocument();
  });

  it("shows a homebrew trait's text as it was written", async () => {
    stubBackend();
    render(<SpeciesPage />);

    await pick("Species", "Gnoll");

    expect(await screen.findByText("Keen Nose")).toBeInTheDocument();
    expect(screen.getByText("You smell things from far away.")).toBeInTheDocument();
  });

  it("says a subspecies result is one, and where it's from", async () => {
    stubBackend();
    render(<SpeciesPage />);
    const input = field("Species");

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "dwarf" } });

    const options = await screen.findAllByRole("option", {}, { timeout: 2500 });
    expect(options.map((option) => option.textContent)).toEqual(["Dwarf5e 2014 Rules", "Hill DwarfSubspecies · 5e 2014 Rules"]);
  });

  it("has no Compare, as there's nothing to line up but traits", async () => {
    stubBackend();
    render(<SpeciesPage />);

    expect(screen.queryByRole("button", { name: "Compare" })).not.toBeInTheDocument();
  });
});

describe("making and changing species", () => {
  it("makes a species with traits, and shows it once saved", async () => {
    const fetchMock = stubBackend({
      "POST /api/species": (body) => ({ ...body, key: "u1-homebrew_lizardfolk", document: homebrew }),
    });
    render(<SpeciesPage />);

    fireEvent.click(screen.getByRole("button", { name: "New species" }));
    expect(screen.getByRole("heading", { name: "New species" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Species name"), { target: { value: "  Lizardfolk " } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Swamp dwellers." } });
    fireEvent.click(screen.getByRole("button", { name: "Add trait" }));
    fireEvent.change(screen.getByLabelText("Trait name"), { target: { value: "Hold Breath" } });
    fireEvent.change(screen.getByLabelText("Trait description"), { target: { value: "You can hold your breath for 15 minutes." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("button", { name: "Duplicate" });
    expect(bodiesSentTo(fetchMock, "POST /api/species")).toEqual([
      {
        name: "Lizardfolk",
        desc: "Swamp dwellers.",
        isSubspecies: false,
        subspeciesOfKey: null,
        traits: [{ name: "Hold Breath", desc: "You can hold your breath for 15 minutes.", type: null, order: null }],
      },
    ]);
    expect(screen.getByRole("heading", { name: "Lizardfolk" })).toBeInTheDocument();
    expect(screen.getByText("dev's homebrew")).toBeInTheDocument();
  });

  it("can't be saved until it is fixed, and says what is wrong", async () => {
    stubBackend();
    render(<SpeciesPage />);

    fireEvent.click(screen.getByRole("button", { name: "New species" }));
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Give the species a name.");

    fireEvent.change(screen.getByLabelText("Species name"), { target: { value: "Gnoll" } });
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Add trait" }));
    expect(screen.getByRole("status")).toHaveTextContent("Trait 1 needs a name and a description.");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Remove trait 1" }));
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();

    fireEvent.click(screen.getByRole("checkbox", { name: "This is a subspecies of another species" }));
    expect(screen.getByRole("status")).toHaveTextContent("Choose the species this is a subspecies of.");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("makes a subspecies of a species, offering only species that aren't subspecies", async () => {
    const fetchMock = stubBackend({
      "POST /api/species": (body) => ({ ...body, key: "u1-homebrew_mountain", document: homebrew }),
    });
    render(<SpeciesPage />);

    fireEvent.click(screen.getByRole("button", { name: "New species" }));
    fireEvent.change(screen.getByLabelText("Species name"), { target: { value: "Mountain Dwarf" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "This is a subspecies of another species" }));
    const input = screen.getByRole("combobox", { name: "Subspecies of" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "dwarf" } });
    const options = await screen.findAllByRole("option", {}, { timeout: 2500 });
    expect(options.map((option) => option.textContent)).toEqual(["Dwarf5e 2014 Rules"]); // not Hill Dwarf
    fireEvent.click(options[0]);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("button", { name: "Duplicate" });
    expect(bodiesSentTo(fetchMock, "POST /api/species")[0]).toMatchObject({ isSubspecies: true, subspeciesOfKey: "srd_dwarf" });
    expect(screen.getByText("Subspecies of Dwarf")).toBeInTheDocument();
  });

  it("changes one of the user's own, starting from what it is", async () => {
    const fetchMock = stubBackend({
      "PUT /api/species/u1-homebrew_gnoll": (body) => ({ ...body, key: "u1-homebrew_gnoll", document: homebrew }),
    });
    render(<SpeciesPage />);
    await pick("Species", "Gnoll");

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    expect(screen.getByRole("heading", { name: "Edit Gnoll" })).toBeInTheDocument();
    expect(screen.getByLabelText("Species name")).toHaveValue("Gnoll");
    expect(screen.getByLabelText("Trait name")).toHaveValue("Keen Nose");
    fireEvent.change(screen.getByLabelText("Trait description"), { target: { value: "You smell blood from a mile away." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByText("You smell blood from a mile away.");
    expect(bodiesSentTo(fetchMock, "PUT /api/species/u1-homebrew_gnoll")[0]).toMatchObject({
      name: "Gnoll",
      traits: [{ name: "Keen Nose", desc: "You smell blood from a mile away." }],
    });
  });

  it("keeps traits in the order they are moved to, and drops one that is removed", async () => {
    const fetchMock = stubBackend({ "POST /api/species": (body) => ({ ...body, key: "u1-homebrew_x", document: homebrew }) });
    render(<SpeciesPage />);
    fireEvent.click(screen.getByRole("button", { name: "New species" }));
    fireEvent.change(screen.getByLabelText("Species name"), { target: { value: "Odd" } });
    for (const name of ["First", "Second", "Third"]) {
      fireEvent.click(screen.getByRole("button", { name: "Add trait" }));
      const group = screen.getAllByRole("group", { name: /^Trait \d$/ }).at(-1);
      fireEvent.change(within(group).getByLabelText("Trait name"), { target: { value: name } });
      fireEvent.change(within(group).getByLabelText("Trait description"), { target: { value: `${name} text` } });
    }

    fireEvent.click(screen.getByRole("button", { name: "Move trait 3 up" })); // First, Third, Second
    fireEvent.click(screen.getByRole("button", { name: "Remove trait 1" })); // Third, Second
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("button", { name: "Duplicate" });
    expect(bodiesSentTo(fetchMock, "POST /api/species")[0].traits.map((trait) => trait.name)).toEqual(["Third", "Second"]);
  });

  it("shows why it couldn't be saved, and stays", async () => {
    stubBackend({
      "POST /api/species": () => new Response(JSON.stringify({ detail: "A species needs a name" }), { status: 400 }),
    });
    render(<SpeciesPage />);
    fireEvent.click(screen.getByRole("button", { name: "New species" }));
    fireEvent.change(screen.getByLabelText("Species name"), { target: { value: "Gnoll" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("A species needs a name");
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("goes back without saving when cancelled", async () => {
    const fetchMock = stubBackend();
    render(<SpeciesPage />);
    fireEvent.click(screen.getByRole("button", { name: "New species" }));

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("combobox", { name: "Species" })).toBeInTheDocument();
    expect(bodiesSentTo(fetchMock, "POST /api/species")).toEqual([]);
  });
});

describe("copying and deleting", () => {
  it("offers Duplicate but not Edit or Delete on someone else's species, and opens the copy to change", async () => {
    stubBackend({
      "POST /api/species/srd_dwarf/copy": () => ({ ...dwarf, key: "u1-homebrew_dwarf", name: "Dwarf", derivedFrom: "srd_dwarf", document: homebrew }),
    });
    render(<SpeciesPage />);
    await pick("Species", "Dwarf");

    expect(await screen.findByRole("button", { name: "Duplicate" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));

    expect(await screen.findByRole("heading", { name: "Edit Dwarf" })).toBeInTheDocument();
    expect(screen.getByText("Based on srd_dwarf")).toBeInTheDocument();
  });

  it("deletes one of the user's own, after asking", async () => {
    const fetchMock = stubBackend({ "DELETE /api/species/u1-homebrew_gnoll": null });
    render(<SpeciesPage />);
    await pick("Species", "Gnoll");

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete Gnoll?")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Gnoll" })).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([url, init]) => url === "/api/species/u1-homebrew_gnoll" && init?.method === "DELETE")).toBe(true);
  });
});
