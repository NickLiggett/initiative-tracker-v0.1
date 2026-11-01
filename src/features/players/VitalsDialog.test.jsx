import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { bodiesSentTo, stubApi } from "../../test/fakeApi";
import HpBar from "./HpBar";
import VitalsDialog from "./VitalsDialog";

afterEach(() => vi.unstubAllGlobals());

const thorin = {
  id: 7,
  name: "Thorin",
  hitPoints: 52,
  vitals: { currentHp: 40, tempHp: 0, heroicInspiration: false, conditions: [], exhaustion: 0, deathSaveSuccesses: 0, deathSaveFailures: 0 },
};

function open(props = {}) {
  const onSaved = vi.fn();
  const fetchMock = stubApi({ "PATCH /api/players/7/vitals": (body) => ({ ...thorin, vitals: { ...thorin.vitals, ...body } }) });
  render(<VitalsDialog player={thorin} onSaved={onSaved} onClose={vi.fn()} {...props} />);
  return { fetchMock, onSaved };
}

const save = () => fireEvent.click(screen.getByRole("button", { name: "Save" }));

describe("the vitals dialog", () => {
  it("starts with the character's hit points and nothing to save", () => {
    open();

    expect(screen.getByLabelText("Hit points")).toHaveValue("40");
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("sends only what was changed", async () => {
    const { fetchMock, onSaved } = open();

    fireEvent.change(screen.getByLabelText("Temporary hit points"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Show the other conditions" }));
    fireEvent.click(screen.getByRole("button", { name: "Poisoned" }));
    fireEvent.click(screen.getByRole("button", { name: "Poisoned" })); // and back
    fireEvent.click(screen.getByRole("button", { name: "Prone" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Heroic Inspiration" }));
    save();

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(bodiesSentTo(fetchMock, "PATCH /api/players/7/vitals")).toEqual([
      { tempHp: 5, heroicInspiration: true, conditions: ["Prone"] },
    ]);
  });

  it("takes damage and healing as +5 and -7, stopping at nothing and at the maximum", async () => {
    const { fetchMock } = open();

    fireEvent.change(screen.getByLabelText("Hit points"), { target: { value: "-100" } });
    save();
    await waitFor(() => expect(bodiesSentTo(fetchMock, "PATCH /api/players/7/vitals")).toEqual([{ currentHp: 0 }]));
  });

  it("heals no further than the maximum", async () => {
    const { fetchMock } = open();

    fireEvent.change(screen.getByLabelText("Hit points"), { target: { value: "+100" } });
    save();
    await waitFor(() => expect(bodiesSentTo(fetchMock, "PATCH /api/players/7/vitals")).toEqual([{ currentHp: 52 }]));
  });

  it("will not save hit points above the maximum, or temporary ones that aren't a number", () => {
    open();

    fireEvent.change(screen.getByLabelText("Hit points"), { target: { value: "53" } });
    expect(screen.getByText("Hit points must be 0 to 52.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Hit points"), { target: { value: "40" } });
    fireEvent.change(screen.getByLabelText("Temporary hit points"), { target: { value: "lots" } });
    expect(screen.getByText("Temporary hit points must be 0 to 999.")).toBeInTheDocument();
  });

  it("marks death saves with a tap and clears them with another on the same one", async () => {
    const { fetchMock } = open();

    fireEvent.click(screen.getByRole("button", { name: "Failures 2" }));
    save();

    await waitFor(() => expect(bodiesSentTo(fetchMock, "PATCH /api/players/7/vitals")).toEqual([{ deathSaveFailures: 2 }]));
  });

  it("says why it couldn't save, and stays open", async () => {
    stubApi({ "PATCH /api/players/7/vitals": new Response(JSON.stringify({ detail: "No player 7" }), { status: 404 }) });
    const onSaved = vi.fn();
    render(<VitalsDialog player={thorin} onSaved={onSaved} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Temporary hit points"), { target: { value: "5" } });
    save();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe("the hit point bar", () => {
  it("says the figures, with temporary hit points beside them", () => {
    render(<HpBar player={{ ...thorin, vitals: { ...thorin.vitals, currentHp: 20, tempHp: 4 } }} />);

    expect(screen.getByRole("progressbar", { name: "Hit points 20 of 52, 4 temporary" })).toHaveAttribute("aria-valuenow", "20");
    expect(screen.getByText("+4 temp")).toBeInTheDocument();
  });

  it("is only a figure for a character with no maximum", () => {
    render(<HpBar player={{ id: 1, name: "Nobody", hitPoints: null }} />);

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
