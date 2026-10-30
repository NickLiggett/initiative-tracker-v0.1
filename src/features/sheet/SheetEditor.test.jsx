import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { bodiesSentTo, stubApi } from "../../test/fakeApi";
import SheetEditor from "./SheetEditor";
import SheetFields from "./SheetFields";

afterEach(() => vi.unstubAllGlobals());

const player = { id: 7, name: "Dante", level: 14, version: 3, sheet: { attacks: [{ name: "Longsword" }], abilities: { dex: 18 } } };

function open(props = {}) {
  const onSaved = vi.fn();
  const fetchMock = stubApi({ "PUT /api/players/7/sheet": (body) => ({ ...player, version: 4, sheet: body.sheet }) });
  render(<SheetEditor player={player} onSaved={onSaved} onClose={vi.fn()} {...props} />);
  return { fetchMock, onSaved };
}

const save = () => fireEvent.click(screen.getByRole("button", { name: "Save" }));

describe("the sheet editor", () => {
  it("starts from the sheet", () => {
    open();

    expect(screen.getByLabelText("Dexterity")).toHaveValue("18");
    expect(screen.getByLabelText("Strength")).toHaveValue("");
  });

  it("sends the whole sheet with the version it was opened at, keeping what the form doesn't show", async () => {
    const { fetchMock, onSaved } = open();

    fireEvent.change(screen.getByLabelText("Strength"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Dexterity saving throw" }));
    fireEvent.change(screen.getByLabelText("Walking speed (ft.)"), { target: { value: "35" } });
    fireEvent.change(screen.getByLabelText("Senses"), { target: { value: "Darkvision 120 ft." } });
    save();

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(bodiesSentTo(fetchMock, "PUT /api/players/7/sheet")).toEqual([
      {
        version: 3,
        sheet: {
          attacks: [{ name: "Longsword" }],
          abilities: { str: 12, dex: 18 },
          saves: ["dex"],
          speed: { walk: 35 },
          senses: ["Darkvision 120 ft."],
        },
      },
    ]);
  });

  it("marks a skill as proficient or expertise", async () => {
    const { fetchMock, onSaved } = open();

    fireEvent.mouseDown(screen.getByLabelText("Stealth (DEX)"));
    fireEvent.click(await screen.findByRole("option", { name: "Expertise" }));
    save();

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(bodiesSentTo(fetchMock, "PUT /api/players/7/sheet")[0].sheet.skills).toEqual({ stealth: "expertise" });
  });

  it("will not save a score that isn't one, and says which", () => {
    open();

    fireEvent.change(screen.getByLabelText("Wisdom"), { target: { value: "99" } });

    expect(screen.getByText("Wisdom must be 1 to 30, or left empty.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("says when the sheet was changed by someone else, and stays open", async () => {
    stubApi({ "PUT /api/players/7/sheet": new Response(JSON.stringify({ detail: "Dante was saved by someone else since you opened it" }), { status: 409 }) });
    const onSaved = vi.fn();
    render(<SheetEditor player={player} onSaved={onSaved} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Strength"), { target: { value: "12" } });
    save();

    expect(await screen.findByText(/saved by someone else/)).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("saves against the version it opened with, though a newer copy arrives while it is open", async () => {
    const fetchMock = stubApi({ "PUT /api/players/7/sheet": (body) => ({ ...player, sheet: body.sheet }) });
    const { rerender } = render(<SheetEditor player={player} onSaved={vi.fn()} onClose={vi.fn()} />);

    rerender(<SheetEditor player={{ ...player, version: 9, sheet: { abilities: { dex: 3 } } }} onSaved={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Strength"), { target: { value: "12" } });
    save();

    await waitFor(() => expect(bodiesSentTo(fetchMock, "PUT /api/players/7/sheet")).toHaveLength(1));
    expect(bodiesSentTo(fetchMock, "PUT /api/players/7/sheet")[0].version).toBe(3);
  });
});

describe("the sheet's fields", () => {
  const sheet = {
    abilities: { str: 12, dex: 20, con: 18, int: 12, wis: 16, cha: 10 },
    saves: ["dex", "int"],
    skills: { stealth: "expertise", perception: "proficient" },
    speed: { walk: 35 },
    senses: ["Darkvision 120 ft."],
    defenses: { resistances: ["necrotic"] },
    personal: { alignment: "Chaotic Good", backstory: "Long ago..." },
  };

  it("works out the modifiers, saves, skills and passive scores from the scores and the level", () => {
    render(<SheetFields sheet={sheet} level={14} />);

    expect(screen.getByLabelText("Dexterity")).toHaveTextContent("+5");
    expect(screen.getByLabelText("Dexterity")).toHaveTextContent("20");
    expect(screen.getByText("Proficiency bonus +5")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Saving throws" })).getByText("Dexterity").closest("div")).toHaveTextContent("+10");
    expect(screen.getByText("Stealth (DEX)").closest("div")).toHaveTextContent("+15");
    expect(screen.getByText("Passive Perception").closest("div")).toHaveTextContent("18");
    expect(screen.getByText("Walking 35 ft.")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Resistances" })).toHaveTextContent("necrotic");
    expect(screen.getByText("Alignment: Chaotic Good")).toBeInTheDocument();
    expect(screen.getByText("Long ago...")).toBeInTheDocument();
  });

  it("shows nothing for a sheet that is empty", () => {
    const { container } = render(<SheetFields sheet={{}} level={1} />);

    expect(container).toBeEmptyDOMElement();
  });
});
