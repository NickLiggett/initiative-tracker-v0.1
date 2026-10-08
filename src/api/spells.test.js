import { afterEach, describe, expect, it, vi } from "vitest";
import { searchSpells, spellsApi } from "./spells";
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

  it("asks once for each of several classes, and joins the answers: each spell once, by name", async () => {
    const answers = {
      srd_wizard: [spell("a_fireball", "Fireball"), spell("a_shield", "Shield")],
      "srd-2024_wizard": [spell("b_fireball", "Fireball"), spell("a_shield", "Shield")],
    };
    const fetchMock = vi.fn(async (url) => new Response(JSON.stringify({ content: answers[paramsOf(url).class] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const found = await searchSpells("", { classKeys: ["srd_wizard", "srd-2024_wizard"] });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(found.map((one) => one.key)).toEqual(["a_fireball", "b_fireball", "a_shield"]);
  });

  it("gives no more than the page size of the joined answers", async () => {
    const many = (prefix) => Array.from({ length: 5 }, (_, index) => spell(`${prefix}${index}`, `${prefix}${index}`));
    vi.stubGlobal("fetch", vi.fn(async (url) => new Response(JSON.stringify({ content: many(paramsOf(url).class) }), { status: 200 })));

    const found = await searchSpells("", { classKeys: ["a", "b"], pageSize: 6 });

    expect(found).toHaveLength(6);
  });
});

describe("spellsApi", () => {
  it("is the usual resource calls, for spells", async () => {
    const fetchMock = stubApi({ "POST /api/spells/srd_fireball/copy": { key: "u1_fireball" } });

    await spellsApi.copy("srd_fireball");

    expect(urlsOf(fetchMock)[0]).toBe("/api/spells/srd_fireball/copy");
  });
});
