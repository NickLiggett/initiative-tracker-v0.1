import { afterEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../test/fakeApi";
import { createPlayer, deletePlayer, listPlayers, updatePlayer, updateVitals } from "./players";
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

describe("vitals", () => {
  it("patches only the fields it is given", async () => {
    const fetchMock = stubApi({ "PATCH /api/players/2/vitals": (body) => ({ id: 2, vitals: body }) });

    await expect(updateVitals(2, { currentHp: 5 })).resolves.toEqual({ id: 2, vitals: { currentHp: 5 } });

    expect(calls(fetchMock)).toEqual(["PATCH /api/players/2/vitals"]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ currentHp: 5 });
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
    expect(urls[0]).toContain("pageSize=100");
    expect(urls[1]).toContain("pageSize=100");
  });
});
