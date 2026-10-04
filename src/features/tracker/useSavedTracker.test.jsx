import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import dragon from "../../test/fixtures/adult-red-dragon.json";
import { stubApi } from "../../test/fakeApi";
import { toSavedState } from "./trackerState";
import useSavedTracker from "./useSavedTracker";

afterEach(() => vi.unstubAllGlobals());

const gribble = { id: 1, name: "Gribble", initiative: 18, ac: 14, hp: 22, reaction: false, type: "PC", creature: null };
const wyrm = { id: 2, name: "Red Wyrm", initiative: 12, ac: 19, hp: 256, reaction: false, type: "Creature", creature: dragon };

let tracker;
function Harness({ delay = 20 }) {
  tracker = useSavedTracker({ delay });
  return <p data-testid="status">{tracker.status}</p>;
}
const status = () => screen.getByTestId("status").textContent;
const names = () => tracker.combatants.map((combatant) => combatant.name);

/** A backend that keeps the tracker state it is given, so what is saved is what is loaded next. */
function stubBackend({ saved = {}, extra = {} } = {}) {
  let stored = saved;
  const fetchMock = stubApi({
    "GET /api/me/tracker": () => stored,
    "PUT /api/me/tracker": (body) => {
      stored = body;
      return body;
    },
    [`GET /api/creatures/${dragon.key}`]: dragon,
    ...extra,
  });
  return { fetchMock, stored: () => stored };
}

const puts = (fetchMock) => fetchMock.mock.calls.filter(([, init = {}]) => init.method === "PUT");
const waitForStatus = (expected) => waitFor(() => expect(status()).toBe(expected), { timeout: 3000 });

describe("opening the tracker", () => {
  it("is loading, then empty the first time", async () => {
    stubBackend();
    render(<Harness />);
    expect(status()).toBe("loading");

    await waitForStatus("saved");

    expect(tracker.combatants).toEqual([]);
    expect(tracker.nextId.current).toBe(1);
    expect(tracker.notice).toBeNull();
  });

  it("brings back the combatants as they were left, with their creatures looked up again", async () => {
    const { fetchMock } = stubBackend({ saved: toSavedState([gribble, wyrm]) });
    render(<Harness />);

    await waitForStatus("saved");

    expect(names()).toEqual(["Gribble", "Red Wyrm"]);
    expect(tracker.combatants[1].creature).toEqual(dragon);
    expect(tracker.combatants[0].creature).toBeNull();
    expect(fetchMock.mock.calls.filter(([url]) => url.includes("/api/creatures/"))).toHaveLength(1);
    expect(puts(fetchMock)).toHaveLength(0); // nothing changed, so nothing is saved
  });

  it("carries on numbering the combatants after the ones it brought back", async () => {
    stubBackend({ saved: toSavedState([{ ...gribble, id: 4 }, { ...wyrm, id: 9 }]) });
    render(<Harness />);

    await waitForStatus("saved");

    expect(tracker.nextId.current).toBe(10);
  });

  it("looks up a creature that several combatants share only once", async () => {
    const { fetchMock } = stubBackend({ saved: toSavedState([wyrm, { ...wyrm, id: 3, name: "Red Wyrm 2" }, { ...wyrm, id: 4, name: "Red Wyrm 3" }]) });
    render(<Harness />);

    await waitForStatus("saved");

    expect(fetchMock.mock.calls.filter(([url]) => url.includes("/api/creatures/"))).toHaveLength(1);
    expect(names()).toHaveLength(3);
  });

  it("brings back a combatant whose creature can't be found, says so, and does not forget which it was", async () => {
    const { fetchMock, stored } = stubBackend({
      saved: toSavedState([gribble, wyrm]),
      extra: { [`GET /api/creatures/${dragon.key}`]: () => new Response("{}", { status: 404 }) },
    });
    render(<Harness />);
    await waitForStatus("saved");

    expect(names()).toEqual(["Gribble", "Red Wyrm"]);
    expect(tracker.combatants[1].creature).toBeNull();
    expect(tracker.notice).toBe("1 creature couldn't be loaded, so the stat block isn't available.");

    act(() => tracker.setCombatants((current) => current.filter((combatant) => combatant.id !== 1)));
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1));

    expect(stored().combatants).toEqual([expect.objectContaining({ name: "Red Wyrm", creatureKey: dragon.key })]);
  });

  it("copes with a saved state that isn't what it expects", async () => {
    stubBackend({ saved: { combatants: "not a list" } });
    render(<Harness />);

    await waitForStatus("saved");

    expect(tracker.combatants).toEqual([]);
  });
});

describe("saving", () => {
  it("keeps a change a moment after it, once however many came together", async () => {
    const { fetchMock, stored } = stubBackend();
    render(<Harness />);
    await waitForStatus("saved");

    act(() => {
      tracker.setCombatants([gribble]);
      tracker.setCombatants((current) => [...current, wyrm]);
    });
    expect(status()).toBe("saving");
    act(() => tracker.setCombatants((current) => current.map((combatant) => ({ ...combatant, hp: 1 }))));

    await waitForStatus("saved");
    expect(puts(fetchMock)).toHaveLength(1);
    expect(stored().combatants.map((combatant) => [combatant.name, combatant.hp, combatant.creatureKey])).toEqual([
      ["Gribble", 1, null],
      ["Red Wyrm", 1, dragon.key],
    ]);
  });

  it("doesn't send the stat blocks, only the creatures' keys", async () => {
    const { fetchMock } = stubBackend();
    render(<Harness />);
    await waitForStatus("saved");

    act(() => tracker.setCombatants([wyrm]));
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1));

    expect(puts(fetchMock)[0][1].body.length).toBeLessThan(500);
  });

  it("doesn't save again when a change puts things back as they were", async () => {
    const { fetchMock } = stubBackend({ saved: toSavedState([gribble]) });
    render(<Harness />);
    await waitForStatus("saved");

    act(() => tracker.setCombatants([{ ...gribble, hp: 5 }]));
    expect(status()).toBe("saving");
    act(() => tracker.setCombatants([gribble]));

    await waitForStatus("saved");
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(puts(fetchMock)).toHaveLength(0);
  });

  it("says when a save didn't work, and saves when asked to try again", async () => {
    let accepting = false;
    const { fetchMock, stored } = stubBackend({
      extra: { "PUT /api/me/tracker": (body) => (accepting ? body : new Response("{}", { status: 500 })) },
    });
    render(<Harness />);
    await waitForStatus("saved");

    act(() => tracker.setCombatants([gribble]));
    await waitForStatus("failed");
    expect(names()).toEqual(["Gribble"]); // nothing is lost

    accepting = true;
    await act(async () => {
      await tracker.retry();
    });

    expect(status()).toBe("saved");
    expect(puts(fetchMock)).toHaveLength(2);
    expect(stored).toBeDefined();
  });

  it("saves a change that is still waiting when the tracker goes away", async () => {
    const { fetchMock } = stubBackend();
    const { unmount } = render(<Harness delay={60_000} />);
    await waitForStatus("saved");
    act(() => tracker.setCombatants([gribble]));
    expect(puts(fetchMock)).toHaveLength(0); // the minute isn't up

    unmount();

    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1)); // at once, not after the minute
  });

  it("finds a change just made when the tracker is opened again straight away", async () => {
    const { fetchMock } = stubBackend({ extra: {} });
    const first = render(<Harness delay={60_000} />);
    await waitForStatus("saved");
    act(() => tracker.setCombatants([gribble, wyrm]));

    first.unmount(); // saves now, and the save has not finished
    render(<Harness />);
    await waitForStatus("saved");

    expect(names()).toEqual(["Gribble", "Red Wyrm"]);
    expect(puts(fetchMock)).toHaveLength(1);
  });
});

describe("when the saved tracker can't be loaded", () => {
  it("says it isn't saving, and doesn't, rather than replace what is there", async () => {
    const { fetchMock } = stubBackend({ extra: { "GET /api/me/tracker": () => new Response("{}", { status: 401 }) } });
    render(<Harness />);

    await waitForStatus("off");
    act(() => tracker.setCombatants([gribble]));
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(status()).toBe("off");
    expect(names()).toEqual(["Gribble"]); // still works for now
    expect(puts(fetchMock)).toHaveLength(0);
  });

  it("says it isn't saving when there is no backend", async () => {
    stubApi({});
    render(<Harness />);

    await waitForStatus("off");
  });
});
