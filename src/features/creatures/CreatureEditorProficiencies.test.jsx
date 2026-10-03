import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { REFERENCE_ROUTES, bodiesSentTo, stubApi } from "../../test/fakeApi";
import CreatureEditor from "./CreatureEditor";

afterEach(() => vi.unstubAllGlobals());

const form = () => within(screen.getByRole("form", { name: "Creature details" }));
const preview = () => within(screen.getByLabelText("Preview"));
const type = (label, value) => fireEvent.change(form().getByLabelText(label), { target: { value } });

function renderNew() {
  const fetchMock = stubApi({ ...REFERENCE_ROUTES, "POST /api/creatures": (body) => ({ ...body, key: "dev_x" }) });
  const onSaved = vi.fn();
  render(<CreatureEditor creature={null} onSaved={onSaved} onCancel={() => {}} />);
  type(/^Creature name/, "Gribble");
  return { fetchMock, onSaved };
}

async function saved({ fetchMock, onSaved }) {
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  return bodiesSentTo(fetchMock, "POST /api/creatures")[0];
}

describe("saves and skills", () => {
  it("show each bonus, and change it with the proficiency chosen", async () => {
    const editor = renderNew();
    type("Dexterity", "16"); // +3, with a proficiency bonus of +2 at challenge rating 0
    const stealth = within(form().getByRole("group", { name: "Stealth proficiency" }));
    expect(form().getByText("Stealth")).toHaveTextContent("Stealth (DEX) +3");

    fireEvent.click(stealth.getByRole("button", { name: "Expertise" }));
    expect(form().getByText("Stealth")).toHaveTextContent("Stealth (DEX) +7");
    expect(stealth.getByRole("button", { name: "Expertise" })).toHaveAttribute("aria-pressed", "true");
    expect(preview().getByText(/Stealth \+7/)).toBeInTheDocument();

    const saves = within(form().getByRole("group", { name: "Saving throws" }));
    fireEvent.click(saves.getByRole("checkbox", { name: /^Dexterity/ }));
    expect(preview().getByText("Save +5")).toBeInTheDocument(); // on the Dexterity card

    expect(await saved(editor)).toMatchObject({
      skillBonuses: { stealth: 7 },
      skillBonusesAll: { stealth: 7, acrobatics: 3 },
      savingThrows: { dexterity: 5 },
      passivePerception: 10,
    });
  });
});

describe("senses", () => {
  it("are saved as ranges, with the passive perception that goes with them", async () => {
    const editor = renderNew();
    type("Darkvision (feet)", "60");
    type("Wisdom", "14"); // +2
    fireEvent.click(
      within(form().getByRole("group", { name: "Perception proficiency" })).getByRole("button", { name: "Proficient" }),
    );

    expect(form().getByText(/Passive Perception 14/)).toBeInTheDocument();
    expect(preview().getByText(/Darkvision 60 ft\./)).toBeInTheDocument();
    expect(await saved(editor)).toMatchObject({ darkvisionRange: 60, passivePerception: 14 });
  });
});

describe("defenses", () => {
  it("are picked from the backend's lists, and the text follows until it's written by hand", async () => {
    const editor = renderNew();
    const group = () => within(form().getByRole("group", { name: "Damage immunities" }));
    const choose = async (name) => {
      fireEvent.keyDown(group().getByRole("combobox"), { key: "ArrowDown" });
      fireEvent.click(await screen.findByRole("option", { name }));
    };

    await choose("Fire");
    expect(group().getByLabelText("Shown as")).toHaveValue("fire");
    await choose("Cold");
    expect(group().getByLabelText("Shown as")).toHaveValue("fire, cold");
    expect(preview().getByText("Fire, cold")).toBeInTheDocument();

    fireEvent.change(group().getByLabelText("Shown as"), { target: { value: "fire, cold from nonmagical attacks" } });
    fireEvent.keyDown(group().getByRole("combobox"), { key: "ArrowDown" });
    expect(screen.queryByRole("option", { name: "Fire" })).not.toBeInTheDocument(); // already chosen
    fireEvent.click(await screen.findByRole("option", { name: "Acid" }));
    expect(group().getByLabelText("Shown as")).toHaveValue("fire, cold from nonmagical attacks");

    expect((await saved(editor)).resistancesAndImmunities).toMatchObject({
      damageImmunities: [
        { key: "fire", name: "Fire" },
        { key: "cold", name: "Cold" },
        { key: "acid", name: "Acid" },
      ],
      damageImmunitiesDisplay: "fire, cold from nonmagical attacks",
      conditionImmunities: [],
    });
  });
});
