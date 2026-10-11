import { afterEach, describe, expect, it, vi } from "vitest";
import { listSpells, searchSpells, spellsApi } from "./spells";
import { stubApi } from "../test/fakeApi";

afterEach(() => vi.unstubAllGlobals());

const spell = (key, name) => ({ key, name });
const urlsOf = (fetchMock) => fetchMock.mock.calls.map(([url]) => url);
const paramsOf = (url) => Object.fromEntries(new URL(url, "http://backend").searchParams);

describe("searchSpells", () => {
  it("asks for the spells with that name, by name", async () => {
    const fetchMock = stubApi({ "GET /api/spells": { content: [spell("srd_fireball", "Fireball")] } });

    await expect(searchSpells("fire")).resolves.toEqual([spell("srd_fireball", "Fireball")]);

    expect(paramsOf(urlsOf(fetchMock)[0])).toEqual({ name: "fire", pageSize: "25", sort: "name" });
  });

  it("passes the filters on, including a level of 0 for cantrips", async () => {
    const fetchMock = stubApi({ "GET /api/spells": { content: [] } });

    await searchSpells("", { level: 0, school: "evocation", damageType: "fire", concentration: true, ritual: true });

    expect(paramsOf(urlsOf(fetchMock)[0])).toMatchObject({ level: "0", school: "evocation", damageType: "fire", concentration: "true", ritual: "true" });
  });

  it("leaves out the filters that aren't set", async () => {
    const fetchMock = stubApi({ "GET /api/spells": { content: [] } });

    await searchSpells("x", { level: undefined, school: undefined, classKeys: [] });

    expect(Object.keys(paramsOf(urlsOf(fetchMock)[0])).sort()).toEqual(["name", "pageSize", "sort"]);
  });

  it("filters by one class with the backend's own class filter", async () => {
    const fetchMock = stubApi({ "GET /api/spells": { content: [] } });

    await searchSpells("", { classKeys: ["srd_wizard"] });

    expect(paramsOf(urlsOf(fetchMock)[0]).class).toBe("srd_wizard");
  });

  it("asks once for several classes: the spells on the list of any of them", async () => {
    const fetchMock = stubApi({ "GET /api/spells": { content: [spell("a_fireball", "Fireball")] } });

    const found = await searchSpells("", { classKeys: ["srd_wizard", "srd-2024_wizard"] });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(paramsOf(urlsOf(fetchMock)[0]).class).toBe("srd_wizard,srd-2024_wizard");
    expect(found.map((one) => one.key)).toEqual(["a_fireball"]);
  });
});

describe("listSpells", () => {
  it("asks for a page, in an order, with the filters, and gives the page with where it is in the list", async () => {
    const answer = { content: [spell("srd_augury", "Augury")], page: { number: 1, size: 25, totalElements: 31, totalPages: 2 } };
    const fetchMock = stubApi({ "GET /api/spells": answer });

    const found = await listSpells({ name: "", school: "divination", classKeys: ["a", "b"], page: 1, pageSize: 25, sort: "level,desc" });

    expect(found).toEqual(answer);
    expect(paramsOf(urlsOf(fetchMock)[0])).toEqual({ school: "divination", class: "a,b", page: "1", pageSize: "25", sort: "level,desc" });
  });
});

describe("spellsApi", () => {
  it("is the usual resource calls, for spells", async () => {
    const fetchMock = stubApi({ "POST /api/spells/srd_fireball/copy": { key: "u1_fireball" } });

    await spellsApi.copy("srd_fireball");

    expect(urlsOf(fetchMock)[0]).toBe("/api/spells/srd_fireball/copy");
  });
});
