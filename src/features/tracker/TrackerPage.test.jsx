import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { stubApi } from "../../test/fakeApi";
import { toSavedState } from "./trackerState";
import TrackerPage from "./TrackerPage";

afterEach(() => vi.unstubAllGlobals());

const gribble = { id: 1, name: "Gribble", initiative: 18, ac: 14, hp: 22, reaction: false, type: "PC", creature: null };
const snarl = { id: 2, name: "Snarl", initiative: 7, ac: 12, hp: 9, reaction: false, type: "NPC", creature: null };

const puts = (fetchMock) => fetchMock.mock.calls.filter(([, init = {}]) => init.method === "PUT");

describe("TrackerPage", () => {
  it("says it is loading the saved tracker, and then that it is saved", async () => {
    stubApi({ "GET /api/me/tracker": {} });
    render(<TrackerPage />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading your tracker…");
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saved to your account"));
  });

  it("brings back the combatants the user left", async () => {
    stubApi({ "GET /api/me/tracker": toSavedState([gribble, snarl]) });
    render(<TrackerPage />);

    expect(await screen.findByText("Gribble")).toBeInTheDocument();
    expect(screen.getByText("Snarl")).toBeInTheDocument();
    expect(screen.queryByText("Add a character")).not.toBeInTheDocument();
  });

  it("saves a change to the turn order, and says so", async () => {
    const fetchMock = stubApi({
      "GET /api/me/tracker": toSavedState([gribble, snarl]),
      "PUT /api/me/tracker": (body) => body,
    });
    render(<TrackerPage />);
    await screen.findByText("Gribble");

    fireEvent.click(screen.getByRole("button", { name: "Next turn" }));

    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1), { timeout: 3000 });
    expect(JSON.parse(puts(fetchMock)[0][1].body).combatants.map((combatant) => combatant.name)).toEqual(["Snarl", "Gribble"]);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saved to your account"));
  });

  it("clearing the tracker is saved too", async () => {
    const fetchMock = stubApi({
      "GET /api/me/tracker": toSavedState([gribble]),
      "PUT /api/me/tracker": (body) => body,
    });
    render(<TrackerPage />);
    await screen.findByText("Gribble");

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1), { timeout: 3000 });
    expect(JSON.parse(puts(fetchMock)[0][1].body)).toEqual({ version: 1, combatants: [] });
  });

  it("offers to try again when a save didn't work", async () => {
    let accepting = false;
    const fetchMock = stubApi({
      "GET /api/me/tracker": toSavedState([gribble, snarl]),
      "PUT /api/me/tracker": (body) => (accepting ? body : new Response("{}", { status: 500 })),
    });
    render(<TrackerPage />);
    await screen.findByText("Gribble");
    fireEvent.click(screen.getByRole("button", { name: "Next turn" }));

    const retry = await screen.findByRole("button", { name: "Couldn't save: try again" }, { timeout: 3000 });
    accepting = true;
    fireEvent.click(retry);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Saved to your account"));
    expect(puts(fetchMock)).toHaveLength(2);
  });

  it("says it isn't saving, and still works, when the account can't be reached", async () => {
    const fetchMock = stubApi({});
    render(<TrackerPage />);

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Not saved: couldn't reach your account"));
    expect(screen.getByText("Add a character")).toBeInTheDocument();
    expect(puts(fetchMock)).toHaveLength(0);
  });

  it("tells the user about a creature that couldn't be brought back", async () => {
    stubApi({
      "GET /api/me/tracker": toSavedState([{ ...snarl, creature: { key: "srd_wolf", name: "Wolf" } }]),
    });
    render(<TrackerPage />);

    expect(await screen.findByText("1 creature couldn't be loaded, so the stat block isn't available.")).toBeInTheDocument();
    expect(screen.getByText("Snarl")).toBeInTheDocument();
  });
});
