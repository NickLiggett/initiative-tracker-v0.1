import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import black from "../../test/fixtures/adult-black-dragon.json";
import { SIZES, TYPES, bodiesSentTo, stubApi } from "../../test/fakeApi";
import CreatureEditor from "./CreatureEditor";

afterEach(() => vi.unstubAllGlobals());

/** Types into a field of the form (not the preview, which has some of the same labels). */
const type = (label, value) =>
  fireEvent.change(within(screen.getByRole("form", { name: "Creature details" })).getByLabelText(label), { target: { value } });

describe("CreatureEditor", () => {
  it("won't save without a name, and previews the creature as it's filled in", async () => {
    stubApi({ "GET /api/sizes": SIZES, "GET /api/creaturetypes": TYPES });
    render(<CreatureEditor creature={null} onSaved={() => {}} onCancel={() => {}} />);

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(within(screen.getByLabelText("Preview")).getByText("Untitled creature")).toBeInTheDocument();

    type(/^Name/, "Gribble");
    type("Strength", "18");

    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(within(screen.getByLabelText("Preview")).getByRole("heading", { name: "Gribble" })).toBeInTheDocument();
    expect(screen.getByText("Modifier +4")).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2)); // sizes and types, so nothing updates after the test
  });

  it("creates a new creature, with its derived numbers", async () => {
    const fetchMock = stubApi({
      "GET /api/sizes": SIZES,
      "GET /api/creaturetypes": TYPES,
      "POST /api/creatures": (body) => ({ ...body, key: "dev_gribble" }),
    });
    const onSaved = vi.fn();
    render(<CreatureEditor creature={null} onSaved={onSaved} onCancel={() => {}} />);

    type(/^Name/, "Gribble");
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
      "GET /api/sizes": SIZES,
      "GET /api/creaturetypes": TYPES,
      "PUT /api/creatures/dev_adult-black-dragon": (body) => body,
    });
    const onSaved = vi.fn();
    render(<CreatureEditor creature={mine} onSaved={onSaved} onCancel={() => {}} />);
    expect(screen.getByText(`Based on ${black.key}`)).toBeInTheDocument();

    type(/^Name/, "Ancient Black Dragon");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [sent] = bodiesSentTo(fetchMock, "PUT /api/creatures/dev_adult-black-dragon");
    expect(sent).toMatchObject({ name: "Ancient Black Dragon", actions: black.actions, traits: black.traits });
  });

  it("shows the backend's message when saving fails", async () => {
    stubApi({ "GET /api/sizes": SIZES, "GET /api/creaturetypes": TYPES });
    const onSaved = vi.fn();
    render(<CreatureEditor creature={null} onSaved={onSaved} onCancel={() => {}} />);

    type(/^Name/, "Gribble");
    fireEvent.click(screen.getByRole("button", { name: "Save" })); // no route for the POST: a 404

    expect(await screen.findByRole("alert")).toHaveTextContent("No route for POST /api/creatures");
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });
});
