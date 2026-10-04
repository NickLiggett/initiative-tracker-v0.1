import { afterEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../test/fakeApi";
import { createPlayer, deletePlayer, listPlayers, updatePlayer } from "./players";
import { listClasses, listSpecies } from "./reference";

afterEach(() => vi.unstubAllGlobals());

const calls = (fetchMock) => fetchMock.mock.calls.map(([url, init]) => `${init.method ?? "GET"} ${url}`);

describe("players", () => {
  it("lists, makes, replaces and deletes", async () => {
    const fetchMock = stubApi({
      "GET /api/players": [{ id: 1, name: "Thorin" }],
      "POST /api/players": (body) => ({ id: 2, ...body }),
      "PUT /api/players/2": (body) => ({ id: 2, ...body }),
      "DELETE /api/players/2": null,
    });

    await expect(listPlayers()).resolves.toEqual([{ id: 1, name: "Thorin" }]);
    await expect(createPlayer({ name: "Aria", ruleset: "5e-2024" })).resolves.toEqual({ id: 2, name: "Aria", ruleset: "5e-2024" });
    await expect(updatePlayer(2, { name: "Aria II" })).resolves.toEqual({ id: 2, name: "Aria II" });
    await deletePlayer(2);

    expect(calls(fetchMock)).toEqual(["GET /api/players", "POST /api/players", "PUT /api/players/2", "DELETE /api/players/2"]);
  });
});

describe("classes and species", () => {
  it("asks for the base classes only, and all the species, of every rule set", async () => {
    const fetchMock = stubApi({
      "GET /api/classes": { content: [{ key: "srd_fighter" }] },
      "GET /api/species": { content: [{ key: "srd_dwarf" }] },
    });

    await expect(listClasses()).resolves.toEqual([{ key: "srd_fighter" }]);
    await expect(listSpecies()).resolves.toEqual([{ key: "srd_dwarf" }]);

    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls[0]).toContain("subclass=false");
    expect(urls[0]).toContain("pageSize=500");
    expect(urls[1]).toContain("pageSize=500");
  });
});
