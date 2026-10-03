import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import black from "../../test/fixtures/adult-black-dragon.json";
import { REFERENCE_ROUTES, bodiesSentTo, stubApi } from "../../test/fakeApi";
import CreatureEditor from "./CreatureEditor";

afterEach(() => vi.unstubAllGlobals());

/** Types into a field of the form (not the preview, which has some of the same labels). */
const type = (label, value) =>
  fireEvent.change(within(screen.getByRole("form", { name: "Creature details" })).getByLabelText(label), { target: { value } });

describe("CreatureEditor", () => {
  it("won't save without a name, and previews the creature as it's filled in", async () => {
    stubApi({ ...REFERENCE_ROUTES });
    render(<CreatureEditor creature={null} onSaved={() => {}} onCancel={() => {}} />);

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(within(screen.getByLabelText("Preview")).getByText("Untitled creature")).toBeInTheDocument();

    type(/^Creature name/, "Gribble");
    type("Strength", "18");

    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(within(screen.getByLabelText("Preview")).getByRole("heading", { name: "Gribble" })).toBeInTheDocument();
    expect(screen.getByText("Modifier +4")).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(4)); // the lists, so nothing updates after the test
  });

  it("creates a new creature, with its derived numbers", async () => {
    const fetchMock = stubApi({
      ...REFERENCE_ROUTES,
      "POST /api/creatures": (body) => ({ ...body, key: "dev_gribble" }),
    });
    const onSaved = vi.fn();
    render(<CreatureEditor creature={null} onSaved={onSaved} onCancel={() => {}} />);

    type(/^Creature name/, "Gribble");
    type("Dexterity", "16");
    type("Hit points", "22");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ key: "dev_gribble" })));
    const [sent] = bodiesSentTo(fetchMock, "POST /api/creatures");
    expect(sent).toMatchObject({ name: "Gribble", hitPoints: 22, modifiers: { dexterity: 3 }, initiativeBonus: 3 });
  });

  it("replaces an existing creature, keeping what the form doesn't show", async () => {
    const mine = { ...black, key: "dev_adult-black-dragon", derivedFrom: black.key };
    const fetchMock = stubApi({
      ...REFERENCE_ROUTES,
      "PUT /api/creatures/dev_adult-black-dragon": (body) => body,
    });
    const onSaved = vi.fn();
    render(<CreatureEditor creature={mine} onSaved={onSaved} onCancel={() => {}} />);
    expect(screen.getByText(`Based on ${black.key}`)).toBeInTheDocument();

    type(/^Creature name/, "Ancient Black Dragon");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [sent] = bodiesSentTo(fetchMock, "PUT /api/creatures/dev_adult-black-dragon");
    expect(sent).toMatchObject({ name: "Ancient Black Dragon", traits: black.traits });
    expect(sent.actions).toHaveLength(black.actions.length);
  });

  it("shows the backend's message when saving fails", async () => {
    stubApi({ ...REFERENCE_ROUTES });
    const onSaved = vi.fn();
    render(<CreatureEditor creature={null} onSaved={onSaved} onCancel={() => {}} />);

    type(/^Creature name/, "Gribble");
    fireEvent.click(screen.getByRole("button", { name: "Save" })); // no route for the POST: a 404

    expect(await screen.findByRole("alert")).toHaveTextContent("No route for POST /api/creatures");
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  describe("traits and actions", () => {
    const form = () => within(screen.getByRole("form", { name: "Creature details" }));
    const entry = (label) => within(form().getByRole("group", { name: label }));
    const renderNew = () => {
      const fetchMock = stubApi({
        ...REFERENCE_ROUTES,
        "POST /api/creatures": (body) => ({ ...body, key: "dev_x" }),
      });
      const onSaved = vi.fn();
      render(<CreatureEditor creature={null} onSaved={onSaved} onCancel={() => {}} />);
      type(/^Creature name/, "Gribble");
      return { fetchMock, onSaved };
    };

    it("adds a trait and shows it in the preview", () => {
      renderNew();

      fireEvent.click(form().getByRole("button", { name: "Add trait" }));
      fireEvent.change(entry("Trait 1").getByLabelText("Name"), { target: { value: "Keen Smell" } });
      fireEvent.change(entry("Trait 1").getByLabelText("Description"), { target: { value: "Advantage on smell checks." } });

      expect(within(screen.getByLabelText("Preview")).getByText("Keen Smell")).toBeInTheDocument();
      expect(within(screen.getByLabelText("Preview")).getByText("Advantage on smell checks.")).toBeInTheDocument();
    });

    it("saves actions of each type, with usage limits and legendary costs", async () => {
      const { fetchMock, onSaved } = renderNew();

      fireEvent.click(form().getByRole("button", { name: "Add action" }));
      fireEvent.change(entry("Action 1").getByLabelText("Name"), { target: { value: "Fire Breath" } });
      fireEvent.change(entry("Action 1").getByLabelText("Usage"), { target: { value: "RECHARGE_ON_ROLL" } });
      fireEvent.change(entry("Action 1").getByLabelText("Recharges on"), { target: { value: "6" } });

      fireEvent.click(form().getByRole("button", { name: "Add legendary action" }));
      fireEvent.change(entry("Legendary action 1").getByLabelText("Name"), { target: { value: "Wing Attack" } });
      fireEvent.change(entry("Legendary action 1").getByLabelText("Legendary action cost"), { target: { value: "2" } });

      expect(within(screen.getByLabelText("Preview")).getByText(/Fire Breath \(Recharge 6\)/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Save" }));

      await waitFor(() => expect(onSaved).toHaveBeenCalled());
      const [sent] = bodiesSentTo(fetchMock, "POST /api/creatures");
      expect(sent.actions).toMatchObject([
        { name: "Fire Breath", actionType: "ACTION", orderInStatblock: 0, usageLimits: { type: "RECHARGE_ON_ROLL", param: 6 } },
        { name: "Wing Attack", actionType: "LEGENDARY_ACTION", orderInStatblock: 0, legendaryActionCost: 2 },
      ]);
    });

    it("changing an action's type moves it to that section", () => {
      renderNew();
      fireEvent.click(form().getByRole("button", { name: "Add action" }));
      fireEvent.change(entry("Action 1").getByLabelText("Name"), { target: { value: "Tail Attack" } });

      fireEvent.change(entry("Action 1").getByLabelText("Type"), { target: { value: "REACTION" } });

      expect(form().queryByRole("group", { name: "Action 1" })).not.toBeInTheDocument();
      expect(entry("Reaction 1").getByLabelText("Name")).toHaveValue("Tail Attack");
    });

    it("reorders and removes entries", () => {
      renderNew();
      for (const name of ["Bite", "Claw"]) {
        fireEvent.click(form().getByRole("button", { name: "Add action" }));
        const position = form().getAllByRole("group", { name: /^Action \d$/ }).length;
        fireEvent.change(entry(`Action ${position}`).getByLabelText("Name"), { target: { value: name } });
      }
      const names = () => form().getAllByRole("group", { name: /^Action \d$/ }).map((group) => within(group).getByLabelText("Name").value);
      expect(names()).toEqual(["Bite", "Claw"]);
      expect(form().getByRole("button", { name: "Move Bite up" })).toBeDisabled();

      fireEvent.click(form().getByRole("button", { name: "Move Claw up" }));
      expect(names()).toEqual(["Claw", "Bite"]);

      fireEvent.click(form().getByRole("button", { name: "Remove Claw" }));
      expect(names()).toEqual(["Bite"]);
    });

    it("keeps the labels of selects that start on an empty choice above their text", () => {
      renderNew();
      fireEvent.click(form().getByRole("button", { name: "Add action" }));

      // "No limit" and "None" are empty values, which MUI would otherwise treat as nothing to put the label above
      for (const label of ["Usage", "Size", "Type"]) {
        expect(form().getAllByText(label, { selector: "label" })[0]).toHaveAttribute("data-shrink", "true"); // the first "Type" is the creature's
      }
    });

    it("won't save an entry without a name, and says why", () => {
      renderNew();
      fireEvent.click(form().getByRole("button", { name: "Add trait" }));

      expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
      expect(screen.getByRole("status")).toHaveTextContent("Name each trait and action, or remove the empty ones.");
    });
  });
});
