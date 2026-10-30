import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { bodiesSentTo, stubApi } from "../../test/fakeApi";
import SheetPage from "./SheetPage";

afterEach(() => vi.unstubAllGlobals());

const thorin = {
  id: 7,
  name: "Thorin",
  ruleset: "5e-2014",
  className: "Fighter",
  speciesName: "Dwarf",
  level: 5,
  armorClass: 18,
  hitPoints: 52,
  initiativeBonus: 1,
  notes: "Carries a grudge",
  owner: "dev",
  playedBy: "anna",
  role: "OWNER",
  vitals: { currentHp: 30, tempHp: 5, heroicInspiration: false, conditions: [], exhaustion: 0, deathSaveSuccesses: 0, deathSaveFailures: 0 },
};

function open(character = thorin) {
  const fetchMock = stubApi({
    "GET /api/players/7": character,
    "PATCH /api/players/7/vitals": (body) => ({ ...character, vitals: { ...character.vitals, ...body } }),
  });
  render(<SheetPage playerId={7} />);
  return fetchMock;
}

const patches = (fetchMock) => bodiesSentTo(fetchMock, "PATCH /api/players/7/vitals");

describe("the character sheet", () => {
  it("shows the character, their numbers and hit points, and names the tab for them", async () => {
    open();

    expect(await screen.findByRole("heading", { name: "Thorin" })).toBeInTheDocument();
    expect(screen.getByText("Level 5 Fighter · Dwarf")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Hit points 30 of 52, 5 temporary" })).toBeInTheDocument();
    expect(screen.getByText("Carries a grudge")).toBeInTheDocument();
    expect(document.title).toBe("Thorin · Character sheet");
  });

  it("deals damage to temporary hit points first", async () => {
    const fetchMock = open();
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: "Damage" }));

    await waitFor(() => expect(patches(fetchMock)).toEqual([{ currentHp: 27, tempHp: 0 }]));
  });

  it("heals no further than the maximum", async () => {
    const fetchMock = open();
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: "Heal" }));

    await waitFor(() => expect(patches(fetchMock)).toEqual([{ currentHp: 52 }]));
  });

  it("saves a condition, inspiration and a death save as they are tapped, and shows the answer", async () => {
    const fetchMock = open();
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.click(screen.getByRole("button", { name: "Prone" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Prone" })).toHaveAttribute("aria-pressed", "true"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Heroic Inspiration" }));
    fireEvent.click(screen.getByRole("button", { name: "Failures 2" }));

    await waitFor(() => expect(patches(fetchMock)).toHaveLength(3));
    expect(patches(fetchMock)).toEqual([{ conditions: ["Prone"] }, { heroicInspiration: true }, { deathSaveFailures: 2 }]);
  });

  it("says why when it can't be opened", async () => {
    stubApi({ "GET /api/players/7": new Response(JSON.stringify({ detail: "No player 7" }), { status: 404 }) });
    render(<SheetPage playerId={7} />);

    expect(await screen.findByText("This character isn't there, or isn't shared with you.")).toBeInTheDocument();
  });

  it("lets a DM change the live fields of a party member's character", async () => {
    const fetchMock = open({ ...thorin, role: "PARTY", owner: "anna" });
    await screen.findByRole("heading", { name: "Thorin" });

    fireEvent.click(screen.getByRole("button", { name: "Stunned" }));

    await waitFor(() => expect(patches(fetchMock)).toEqual([{ conditions: ["Stunned"] }]));
  });
});
