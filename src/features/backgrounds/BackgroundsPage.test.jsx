import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { OWNERSHIP_ROUTES, bodiesSentTo, stubApi } from "../../test/fakeApi";
import BackgroundsPage from "./BackgroundsPage";

afterEach(() => vi.unstubAllGlobals());

const srd = { key: "srd-2014", displayName: "5e 2014 Rules", name: "System Reference Document 5.1", publisher: { name: "Wizards of the Coast" }, gamesystem: { name: "5th Edition 2014" } };
const homebrew = { key: "u1-homebrew", displayName: "dev's homebrew", name: "dev's homebrew" };

const acolyte = {
  key: "srd_acolyte",
  name: "Acolyte",
  desc: "You spent your life in service to a temple.",
  document: srd,
  benefits: [
    { name: "Skill Proficiencies", desc: "Insight, Religion", type: "skill_proficiency", crossreferences: { to: [] } },
    { name: "Shelter of the Faithful", desc: "You can get free healing at temples of your faith.", type: "feature", crossreferences: { to: [] } },
  ],
};
const hermit = {
  key: "u1-homebrew_hermit",
  name: "Hermit",
  desc: "",
  document: homebrew,
  benefits: [{ name: "Languages", desc: "One of your choice.", type: "language", crossreferences: { to: [] } }],
};

function stubBackend(extra = {}) {
  return stubApi({ ...OWNERSHIP_ROUTES, "GET /api/backgrounds": { content: [acolyte, hermit] }, ...extra });
}

async function pick(text, label = "Background") {
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

describe("reading a background", () => {
  it("shows its source, description and benefits, each with what kind it is", async () => {
    stubBackend();
    render(<BackgroundsPage />);

    expect(screen.getByText("Search for a background to see what it gives a character.")).toBeInTheDocument();
    await pick("Acolyte");

    expect(await screen.findByRole("heading", { name: "Acolyte" })).toBeInTheDocument();
    expect(screen.getByText("5e 2014 Rules")).toBeInTheDocument();
    expect(screen.getByText("You spent your life in service to a temple.")).toBeInTheDocument();
    expect(screen.getByText("Skill Proficiencies")).toBeInTheDocument();
    expect(screen.getByText("Insight, Religion")).toBeInTheDocument();
    expect(screen.getByText("Shelter of the Faithful")).toBeInTheDocument();
    expect(screen.getByText("Feature")).toBeInTheDocument();
    expect(screen.queryByText("Skill proficiencies")).not.toBeInTheDocument(); // the name already says it
  });

});

describe("comparing backgrounds", () => {
  it("lines up what each gives by kind, and shows features and descriptions in full side by side", async () => {
    stubBackend();
    render(<BackgroundsPage />);
    await pick("Acolyte");
    await screen.findByRole("heading", { name: "Acolyte" });

    fireEvent.click(screen.getByRole("button", { name: "Compare" }));
    await pick("Hermit", "Compare with");

    const table = within(await screen.findByRole("table"));
    expect(table.getByText("Skill proficiencies")).toBeInTheDocument();
    expect(table.getByText("Insight, Religion")).toBeInTheDocument();
    expect(table.getByText("Languages")).toBeInTheDocument();
    expect(table.getByText("One of your choice.")).toBeInTheDocument();
    expect(table.getByText("Shelter of the Faithful")).toBeInTheDocument(); // a feature, by name
    expect(screen.getByText("You can get free healing at temples of your faith.")).toBeInTheDocument(); // and in full below
    expect(screen.getByText("You spent your life in service to a temple.")).toBeInTheDocument();
  });
});

describe("making and changing backgrounds", () => {
  it("makes a background with benefits, and shows it once saved", async () => {
    const fetchMock = stubBackend({
      "POST /api/backgrounds": (body) => ({ ...body, key: "u1-homebrew_sailor", document: homebrew }),
    });
    render(<BackgroundsPage />);

    fireEvent.click(screen.getByRole("button", { name: "New background" }));
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Background name"), { target: { value: " Sailor " } });
    fireEvent.change(screen.getByLabelText("Description"), { target: { value: "You sailed." } });
    fireEvent.click(screen.getByRole("button", { name: "Add benefit" }));
    expect(screen.getByRole("status")).toHaveTextContent("Benefit 1 needs a name and a description.");
    fireEvent.change(screen.getByLabelText("Benefit name"), { target: { value: "Ship's Passage" } });
    fireEvent.change(screen.getByLabelText("Benefit type"), { target: { value: "feature" } });
    fireEvent.change(screen.getByLabelText("Benefit description"), { target: { value: "Free passage on ships." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("button", { name: "Duplicate" });
    expect(bodiesSentTo(fetchMock, "POST /api/backgrounds")).toEqual([
      {
        name: "Sailor",
        desc: "You sailed.",
        benefits: [{ name: "Ship's Passage", desc: "Free passage on ships.", type: "feature", crossreferences: { to: [] } }],
      },
    ]);
    expect(screen.getByRole("heading", { name: "Sailor" })).toBeInTheDocument();
    expect(screen.getByText("dev's homebrew")).toBeInTheDocument();
  });

  it("changes one of the user's own, starting from what it is", async () => {
    const fetchMock = stubBackend({
      "PUT /api/backgrounds/u1-homebrew_hermit": (body) => ({ ...body, key: "u1-homebrew_hermit", document: homebrew }),
    });
    render(<BackgroundsPage />);
    await pick("Hermit");

    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    expect(screen.getByRole("heading", { name: "Edit Hermit" })).toBeInTheDocument();
    expect(screen.getByLabelText("Benefit name")).toHaveValue("Languages");
    expect(screen.getByLabelText("Benefit type")).toHaveValue("language");
    fireEvent.change(screen.getByLabelText("Benefit description"), { target: { value: "Two of your choice." } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByText("Two of your choice.");
    expect(bodiesSentTo(fetchMock, "PUT /api/backgrounds/u1-homebrew_hermit")[0]).toMatchObject({
      name: "Hermit",
      benefits: [{ name: "Languages", desc: "Two of your choice.", type: "language" }],
    });
  });

  it("keeps benefits in the order they are moved to, and drops one that is removed", async () => {
    const fetchMock = stubBackend({ "POST /api/backgrounds": (body) => ({ ...body, key: "u1-homebrew_x", document: homebrew }) });
    render(<BackgroundsPage />);
    fireEvent.click(screen.getByRole("button", { name: "New background" }));
    fireEvent.change(screen.getByLabelText("Background name"), { target: { value: "Odd" } });
    for (const name of ["First", "Second", "Third"]) {
      fireEvent.click(screen.getByRole("button", { name: "Add benefit" }));
      const group = screen.getAllByRole("group", { name: /^Benefit \d$/ }).at(-1);
      fireEvent.change(within(group).getByLabelText("Benefit name"), { target: { value: name } });
      fireEvent.change(within(group).getByLabelText("Benefit description"), { target: { value: `${name} text` } });
    }

    fireEvent.click(screen.getByRole("button", { name: "Move benefit 3 up" })); // First, Third, Second
    fireEvent.click(screen.getByRole("button", { name: "Remove benefit 1" })); // Third, Second
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("button", { name: "Duplicate" });
    expect(bodiesSentTo(fetchMock, "POST /api/backgrounds")[0].benefits.map((benefit) => benefit.name)).toEqual(["Third", "Second"]);
  });

  it("offers Duplicate but not Edit or Delete on someone else's background, and opens the copy to change", async () => {
    stubBackend({
      "POST /api/backgrounds/srd_acolyte/copy": () => ({ ...acolyte, key: "u1-homebrew_acolyte", derivedFrom: "srd_acolyte", document: homebrew }),
    });
    render(<BackgroundsPage />);
    await pick("Acolyte");

    expect(await screen.findByRole("button", { name: "Duplicate" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));

    expect(await screen.findByRole("heading", { name: "Edit Acolyte" })).toBeInTheDocument();
    expect(screen.getByText("Based on srd_acolyte")).toBeInTheDocument();
  });

  it("deletes one of the user's own, after asking", async () => {
    const fetchMock = stubBackend({ "DELETE /api/backgrounds/u1-homebrew_hermit": null });
    render(<BackgroundsPage />);
    await pick("Hermit");

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    expect(screen.getByText("Delete Hermit?")).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByRole("heading", { name: "Hermit" })).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([url, init]) => url === "/api/backgrounds/u1-homebrew_hermit" && init?.method === "DELETE")).toBe(true);
  });
});
