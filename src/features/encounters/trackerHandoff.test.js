import { afterEach, describe, expect, it, vi } from "vitest";
import { bodiesSentTo, stubApi } from "../../test/fakeApi";
import { addToSavedTracker } from "./trackerHandoff";

afterEach(() => vi.unstubAllGlobals());

const goblin = { key: "srd_goblin", name: "Goblin", armorClass: 15, hitPoints: 7 };

describe("addToSavedTracker", () => {
  it("adds after what the tracker already has, with new ids, remembering each creature by its key", async () => {
    const existing = [{ id: 4, initiative: 15, name: "Ana", ac: 16, hp: 30, reaction: false, type: "PC", creatureKey: null, playerId: 7 }];
    const fetchMock = stubApi({ "GET /api/me/tracker": { version: 1, combatants: existing }, "PUT /api/me/tracker": {} });

    const added = await addToSavedTracker([
      { initiative: 12, name: "Goblin 1", ac: 15, hp: 7, reaction: false, type: "Creature", creature: goblin },
      { initiative: 12, name: "Goblin 2", ac: 15, hp: 7, reaction: false, type: "Creature", creature: goblin },
    ]);

    expect(added).toBe(2);
    const [saved] = bodiesSentTo(fetchMock, "PUT /api/me/tracker");
    expect(saved.version).toBe(1);
    expect(saved.combatants).toEqual([
      existing[0],
      { id: 5, initiative: 12, name: "Goblin 1", ac: 15, hp: 7, reaction: false, type: "Creature", creatureKey: "srd_goblin" },
      { id: 6, initiative: 12, name: "Goblin 2", ac: 15, hp: 7, reaction: false, type: "Creature", creatureKey: "srd_goblin" },
    ]);
  });

  it("starts from nothing when the tracker has never been saved", async () => {
    const fetchMock = stubApi({ "GET /api/me/tracker": {}, "PUT /api/me/tracker": {} });

    await addToSavedTracker([{ initiative: 3, name: "Goblin", ac: 15, hp: 7, reaction: false, type: "Creature", creature: goblin }]);

    expect(bodiesSentTo(fetchMock, "PUT /api/me/tracker")[0].combatants.map((one) => one.id)).toEqual([1]);
  });

  it("keeps whatever else the saved state has", async () => {
    const fetchMock = stubApi({ "GET /api/me/tracker": { version: 1, combatants: [], round: 3 }, "PUT /api/me/tracker": {} });

    await addToSavedTracker([]);

    expect(bodiesSentTo(fetchMock, "PUT /api/me/tracker")[0]).toMatchObject({ round: 3 });
  });

  it("saves nothing when the saved tracker can't be read, rather than replace it", async () => {
    const fetchMock = stubApi({ "GET /api/me/tracker": () => new Response(JSON.stringify({ detail: "down" }), { status: 500 }) });

    await expect(addToSavedTracker([{ initiative: 1, name: "x", creature: null }])).rejects.toThrow();
    expect(bodiesSentTo(fetchMock, "PUT /api/me/tracker")).toEqual([]);
  });
});
