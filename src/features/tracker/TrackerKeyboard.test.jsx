import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { stubApi } from "../../test/fakeApi";
import { toSavedState } from "./trackerState";
import TrackerPage from "./TrackerPage";

afterEach(() => vi.unstubAllGlobals());

const gribble = { id: 1, name: "Gribble", initiative: 18, ac: 14, hp: 22, reaction: false, type: "PC", creature: null };
const snarl = { id: 2, name: "Snarl", initiative: 7, ac: 12, hp: 9, reaction: false, type: "NPC", creature: null };
const goblin = { key: "goblin", name: "Goblin", armorClass: 15, hitPoints: 7, initiativeBonus: 2, document: { key: "srd-2014", displayName: "5e 2014 Rules" } };

async function openTracker(combatants = [gribble, snarl]) {
  stubApi({
    "GET /api/me/tracker": toSavedState(combatants),
    "PUT /api/me/tracker": (body) => body,
    "GET /api/creatures": { content: [goblin] },
  });
  render(<TrackerPage />);
  await screen.findByText(combatants[0].name);
}

const footer = () => within(document.querySelector("form"));
const names = () => [...document.querySelectorAll('[role="cell"][data-field="name"]')].map((cell) => cell.textContent);

/** Types into the Type field and presses Enter on the option it highlights. */
function chooseType(type) {
  const input = footer().getByRole("combobox", { name: "Type" });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: type } });
  fireEvent.keyDown(input, { key: "Enter" });
}

describe("Space moves the turn on", () => {
  it("rotates the order, as Next turn does", async () => {
    await openTracker();
    expect(names().slice(0, 2)).toEqual(["Gribble", "Snarl"]);

    fireEvent.keyDown(document.body, { key: " " });

    await waitFor(() => expect(names().slice(0, 2)).toEqual(["Snarl", "Gribble"]));
  });

  it("does nothing while typing in a field", async () => {
    await openTracker();

    fireEvent.keyDown(footer().getByLabelText("Name"), { key: " " });

    expect(names().slice(0, 2)).toEqual(["Gribble", "Snarl"]);
  });

  it("is left to a focused button", async () => {
    await openTracker();

    fireEvent.keyDown(footer().getByRole("button", { name: "Sort" }), { key: " " });

    expect(names().slice(0, 2)).toEqual(["Gribble", "Snarl"]);
  });

  it("does nothing while a dialog is open", async () => {
    await openTracker();
    fireEvent.click(footer().getByRole("button", { name: "Characters" }));
    await screen.findByRole("dialog");

    fireEvent.keyDown(document.body, { key: " " });

    expect(names().slice(0, 2)).toEqual(["Gribble", "Snarl"]);
  });

  it("is part of what Next turn says", async () => {
    await openTracker();
    expect(screen.getByRole("button", { name: "Next turn" })).toBeInTheDocument();
  });
});

describe("Enter adds the combatant", () => {
  it("submits from any field", async () => {
    await openTracker();
    fireEvent.change(footer().getByLabelText("Name"), { target: { value: "Zed" } });
    fireEvent.change(footer().getByLabelText("Initiative"), { target: { value: "12" } });
    chooseType("NPC");

    fireEvent.submit(document.querySelector("form"));

    expect(await screen.findByText("Zed")).toBeInTheDocument();
    expect(footer().getByLabelText("Name")).toHaveValue("");
  });

  it("has a Submit button that submits the form", async () => {
    await openTracker();
    expect(footer().getByRole("button", { name: "Submit" })).toHaveAttribute("type", "submit");
    expect(footer().getByRole("button", { name: "Clear" })).toHaveAttribute("type", "button");
  });
});

describe("choosing a creature in the form", () => {
  async function chooseGoblin() {
    chooseType("Creature");
    const search = await footer().findByRole("combobox", { name: "Creature" });
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: "Goblin" } });
    fireEvent.click(await screen.findByRole("option", { name: /Goblin/ }, { timeout: 2500 }));
  }

  it("fills the name, initiative, AC and HP that were left empty", async () => {
    await openTracker();
    await chooseGoblin();

    expect(footer().getByLabelText("Name")).toHaveValue("Goblin");
    expect(footer().getByLabelText("AC")).toHaveValue("15");
    expect(footer().getByLabelText("HP")).toHaveValue("7");
    expect(footer().getByLabelText("Initiative").value).toMatch(/^\d+$/);
  });

  it("keeps the values the user typed", async () => {
    await openTracker();
    fireEvent.change(footer().getByLabelText("Name"), { target: { value: "Skulker" } });
    fireEvent.change(footer().getByLabelText("HP"), { target: { value: "12" } });
    await chooseGoblin();

    expect(footer().getByLabelText("Name")).toHaveValue("Skulker");
    expect(footer().getByLabelText("HP")).toHaveValue("12");
    expect(footer().getByLabelText("AC")).toHaveValue("15");
  });
});
