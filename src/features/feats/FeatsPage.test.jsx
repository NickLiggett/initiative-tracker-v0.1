import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { OWNERSHIP_ROUTES, bodiesSentTo, stubApi } from "../../test/fakeApi";
import FeatsPage from "./FeatsPage";

afterEach(() => vi.unstubAllGlobals());

const srd = { key: "srd-2024", displayName: "5e 2024 Rules", name: "System Reference Document 5.2", publisher: { name: "Wizards of the Coast" }, gamesystem: { name: "5th Edition 2024" } };
const homebrew = { key: "u1-homebrew", displayName: "dev's homebrew", name: "dev's homebrew" };

const alert = {
  key: "srd-2024_alert",
  name: "Alert",
  type: "Origin",
  hasPrerequisite: false,
  prerequisite: null,
  desc: "",
  document: srd,
  benefits: [{ desc: "You add your proficiency bonus to initiative rolls." }, { desc: "You can swap initiative with an ally." }],
};
const grappler = {
  key: "srd-2024_grappler",
  name: "Grappler",
  type: "GENERAL",
  hasPrerequisite: true,
  prerequisite: "Strength or Dexterity 13 or higher",
  desc: "",
  document: srd,
  benefits: [{ desc: "You have advantage on attacks against a creature you are grappling." }],
};
const tough = {
  key: "u1-homebrew_tough",
  name: "Tougher",
  type: "General",
  hasPrerequisite: false,
  prerequisite: null,
  desc: "Hardy folk.",
  document: homebrew,
  benefits: [{ desc: "Your hit point maximum goes up by 2 per level." }],
};
const feats = [alert, grappler, tough];

/** A backend whose feat list answers a search the way the real one does: by name, exact type and hasPrerequisite. */
function stubBackend(extra = {}) {
  const base = stubApi({ ...OWNERSHIP_ROUTES, ...extra });
  const fetchMock = vi.fn(async (url, init = {}) => {
    const address = new URL(url, "http://backend");
    if ((init.method ?? "GET") === "GET" && address.pathname === "/api/feats") {
      const name = (address.searchParams.get("name") ?? "").toLowerCase();
      const type = address.searchParams.get("type");
      const needs = address.searchParams.get("hasPrerequisite");
      const found = feats.filter(
        (one) => one.name.toLowerCase().includes(name) && (type === null || one.type === type) && (needs === null || String(one.hasPrerequisite) === needs),
      );
      return new Response(JSON.stringify({ content: found }), { status: 200 });
    }
    return base(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const field = () => screen.getByRole("combobox", { name: "Feat" });

async function pick(text, label = "Feat") {
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

describe("reading a feat", () => {
  it("shows its kind, source and benefits", async () => {
    stubBackend();
    render(<FeatsPage />);

    expect(screen.getByText("Search for a feat to see what it does.")).toBeInTheDocument();
    await pick("Alert");

    expect(await screen.findByRole("heading", { name: "Alert" })).toBeInTheDocument();
    expect(screen.getByText("Origin feat")).toBeInTheDocument();
    expect(screen.getByText("5e 2024 Rules")).toBeInTheDocument();
    expect(screen.getByText("You add your proficiency bonus to initiative rolls.")).toBeInTheDocument();
    expect(screen.getByText("You can swap initiative with an ally.")).toBeInTheDocument();
    expect(screen.queryByText(/Prerequisite/)).not.toBeInTheDocument();
  });

  it("shows the prerequisite, and writes a type that is in capitals like the others", async () => {
    stubBackend();
    render(<FeatsPage />);

    await pick("Grappler");

    expect(await screen.findByText("Strength or Dexterity 13 or higher")).toBeInTheDocument();
    expect(screen.getByText("Prerequisite:")).toBeInTheDocument();
    expect(screen.getByText("General feat")).toBeInTheDocument();
  });

  it("says a result's kind and source", async () => {
    stubBackend();
    render(<FeatsPage />);
    const input = field();

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "gra" } });

    const options = within(await screen.findByRole("listbox", {}, { timeout: 2500 })).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["GrapplerGeneral feat · 5e 2024 Rules"]);
  });
});

describe("narrowing the search", () => {
  it("finds a type however the data capitalizes it", async () => {
    stubBackend();
    render(<FeatsPage />);

    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "General" } });
    const input = field();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "er" } });

    const options = within(await screen.findByRole("listbox", {}, { timeout: 2500 })).getAllByRole("option");
    expect(options.map((option) => option.textContent.split("General")[0])).toEqual(["Grappler", "Tougher"]); // "GENERAL" and "General"
  });

  it("finds only feats that have a prerequisite", async () => {
    stubBackend();
    render(<FeatsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Has a prerequisite" }));
    const input = field();
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "er" } });

    const options = within(await screen.findByRole("listbox", {}, { timeout: 2500 })).getAllByRole("option");
    expect(options.map((option) => option.textContent.split("General")[0])).toEqual(["Grappler"]);
  });
});

describe("comparing feats", () => {
  it("lines two feats up by type and prerequisite, then shows what each gives side by side", async () => {
    stubBackend();
    render(<FeatsPage />);
    await pick("Alert");
    await screen.findByRole("heading", { name: "Alert" });

    fireEvent.click(screen.getByRole("button", { name: "Compare" }));
    await pick("Grappler", "Compare with");

    const table = within(await screen.findByRole("table"));
    expect(table.getByText("Origin feat")).toBeInTheDocument();
    expect(table.getByText("General feat")).toBeInTheDocument();
    expect(table.getByText("None")).toBeInTheDocument();
    expect(table.getByText("Strength or Dexterity 13 or higher")).toBeInTheDocument();
    expect(screen.getByText("You add your proficiency bonus to initiative rolls.")).toBeInTheDocument();
    expect(screen.getByText("You have advantage on attacks against a creature you are grappling.")).toBeInTheDocument();
  });

  it("says so, and shows the text once, when two feats give the same", async () => {
    stubBackend();
    render(<FeatsPage />);
    await pick("Alert");
    await screen.findByRole("heading", { name: "Alert" });

    fireEvent.click(screen.getByRole("button", { name: "Compare" }));
    await pick("Alert", "Compare with");

    expect(await screen.findByText("Both feats give the same.")).toBeInTheDocument();
    expect(screen.getAllByText("You can swap initiative with an ally.")).toHaveLength(1);
  });
});

describe("making and changing feats", () => {
  it("makes a feat: a prerequisite makes it one that has one, and it is shown once saved", async () => {
    const fetchMock = stubBackend({ "POST /api/feats": (body) => ({ ...body, key: "u1-homebrew_brawny", document: homebrew }) });
    render(<FeatsPage />);

    fireEvent.click(screen.getByRole("button", { name: "New feat" }));
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Give the feat a name.");
    fireEvent.change(screen.getByLabelText("Feat name"), { target: { value: " Brawny " } });
    fireEvent.change(screen.getByLabelText("Prerequisite"), { target: { value: "Strength 13" } });
    fireEvent.click(screen.getByRole("button", { name: "Add benefit" }));
    expect(screen.getByRole("status")).toHaveTextContent("Benefit 1 needs a description.");
    fireEvent.change(screen.getByLabelText("Benefit description"), { target: { value: "You can lift more." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("button", { name: "Duplicate" });
    expect(bodiesSentTo(fetchMock, "POST /api/feats")).toEqual([
      {
        name: "Brawny",
        type: "General",
        hasPrerequisite: true,
        prerequisite: "Strength 13",
        desc: null,
        benefits: [{ name: null, desc: "You can lift more.", type: null, crossreferences: null }],
      },
    ]);
    expect(screen.getByRole("heading", { name: "Brawny" })).toBeInTheDocument();
    expect(screen.getByText("Strength 13")).toBeInTheDocument();
  });

  it("changes one of the user's own, starting from what it is", async () => {
    const fetchMock = stubBackend({ "PUT /api/feats/u1-homebrew_tough": (body) => ({ ...body, key: "u1-homebrew_tough", document: homebrew }) });
    render(<FeatsPage />);
    await pick("Tougher");

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    expect(screen.getByRole("heading", { name: "Edit Tougher" })).toBeInTheDocument();
    expect(screen.getByLabelText("Feat type")).toHaveValue("General");
    fireEvent.change(screen.getByLabelText("Feat type"), { target: { value: "Epic Boon" } });
    fireEvent.change(screen.getByLabelText("Benefit description"), { target: { value: "Your hit point maximum goes up by 3 per level." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByText("Your hit point maximum goes up by 3 per level.");
    expect(bodiesSentTo(fetchMock, "PUT /api/feats/u1-homebrew_tough")[0]).toMatchObject({
      name: "Tougher",
      type: "Epic Boon",
      hasPrerequisite: false,
    });
  });

  it("keeps a type from another source as it is when it is changed", async () => {
    stubBackend({ "POST /api/feats/srd-2024_grappler/copy": () => ({ ...grappler, key: "u1-homebrew_grappler", document: homebrew }) });
    render(<FeatsPage />);
    await pick("Grappler");

    fireEvent.click(await screen.findByRole("button", { name: "Duplicate" }));

    expect(await screen.findByRole("heading", { name: "Edit Grappler" })).toBeInTheDocument();
    expect(screen.getByLabelText("Feat type")).toHaveValue("GENERAL");
  });

  it("deletes one of the user's own, after asking", async () => {
    const fetchMock = stubBackend({ "DELETE /api/feats/u1-homebrew_tough": null });
    render(<FeatsPage />);
    await pick("Tougher");

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Tougher" })).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([url, init]) => url === "/api/feats/u1-homebrew_tough" && init?.method === "DELETE")).toBe(true);
  });
});
