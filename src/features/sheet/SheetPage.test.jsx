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

  it("lists attacks and features, spends a use with a tap and gives uses back on a rest", async () => {
    const withLists = {
      ...thorin,
      version: 4,
      sheet: {
        attacks: [{ name: "Longsword", bonus: "+9", damage: "1d8+5 slashing" }],
        features: [{ name: "Blood Maledict", uses: { max: 2, used: 0, per: "short" } }, { name: "Revealed Arcana", uses: { max: 1, used: 1, per: "long" } }],
      },
    };
    let saved = withLists; // the backend keeps what it is sent, and a look at it afterwards finds that
    const fetchMock = stubApi({
      "GET /api/players/7": () => saved,
      "PUT /api/players/7/sheet": (body) => (saved = { ...saved, version: saved.version + 1, sheet: body.sheet }),
    });
    render(<SheetPage playerId={7} />);
    expect(await screen.findByText("Longsword")).toBeInTheDocument();
    expect(screen.getByText("1d8+5 slashing")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Spend a use of Blood Maledict" })[0]);
    await waitFor(() => expect(screen.getByText("1 of 2, back on a short rest")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Long rest" }));
    await waitFor(() => expect(screen.getByText("2 of 2, back on a short rest")).toBeInTheDocument());

    const sent = bodiesSentTo(fetchMock, "PUT /api/players/7/sheet");
    expect(sent[0]).toMatchObject({ version: 4 });
    expect(sent[0].sheet.features[0].uses.used).toBe(1);
    expect(sent[1]).toMatchObject({ version: 5 });
    expect(sent[1].sheet.features.map((feature) => feature.uses.used)).toEqual([0, 0]);
  });

  it("shows the lists to a DM, with nothing to tap", async () => {
    stubApi({
      "GET /api/players/7": { ...thorin, role: "PARTY", sheet: { features: [{ name: "Blood Maledict", uses: { max: 2, used: 1, per: "short" } }] } },
    });
    render(<SheetPage playerId={7} />);

    expect(await screen.findByText("1 of 2, back on a short rest")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Short rest" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Take back a use of Blood Maledict" })).toHaveAttribute("aria-disabled", "true");
  });

  it("shows spell slots, pact slots and hit dice, spends them with a tap and refills them on a rest", async () => {
    const withCasting = {
      ...thorin,
      level: 14,
      version: 2,
      sheet: {
        abilities: { wis: 16 },
        spellcasting: { ability: "wis" },
        slots: { 1: { max: 2, used: 0 } },
        pact: { max: 2, used: 0, level: 2 },
        hitDice: [{ die: "d10", max: 4, used: 0 }],
        spells: [{ name: "Misty Step", level: 2, school: "Conjuration", prepared: false }, { name: "Light", level: 0 }],
      },
    };
    let saved = withCasting;
    const fetchMock = stubApi({
      "GET /api/players/7": () => saved,
      "PUT /api/players/7/sheet": (body) => (saved = { ...saved, version: saved.version + 1, sheet: body.sheet }),
    });
    render(<SheetPage playerId={7} />);

    expect(await screen.findByText("Wisdom: spell save DC 16, spell attack +8")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "2nd level" })).toHaveTextContent("Misty Step");
    expect(screen.getByRole("region", { name: "Cantrip" })).toHaveTextContent("Light");
    expect(screen.getByRole("button", { name: "Short rest" })).toBeDisabled(); // nothing spent yet

    fireEvent.click(screen.getAllByRole("button", { name: "Spend Level 1 slot" })[0]);
    await waitFor(() => expect(screen.getByText("1 of 2")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("button", { name: "Spend Pact slot" })[0]);
    await waitFor(() => expect(screen.getAllByText("1 of 2")).toHaveLength(2));
    fireEvent.click(screen.getAllByRole("button", { name: "Spend d10 hit dice" })[0]);
    await waitFor(() => expect(screen.getByText("3 of 4")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Prepare Misty Step" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Unprepare Misty Step" })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Short rest" })); // only the pact slots come back
    await waitFor(() => expect(saved.sheet.pact.used).toBe(0));
    expect(saved.sheet.slots[1].used).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Long rest" }));
    await waitFor(() => expect(saved.sheet.slots[1].used).toBe(0));
    expect(saved.sheet.hitDice[0].used).toBe(0); // half of 4 is 2 and only 1 was spent
    expect(bodiesSentTo(fetchMock, "PUT /api/players/7/sheet").map((sent) => sent.version)).toEqual([2, 3, 4, 5, 6, 7]);
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
