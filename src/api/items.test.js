import { afterEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../test/fakeApi";
import { listItems, searchItems } from "./items";

afterEach(() => vi.unstubAllGlobals());

const rope = { key: "srd_rope", name: "Rope" };
const robe = { key: "srd_robe", name: "Robe of Eyes", rarity: { key: "rare" } };
const ring = { key: "srd_ring", name: "Ring of Rope" };

function stubSearch() {
  return stubApi({ "GET /api/items": { content: [rope, ring] }, "GET /api/magicitems": { content: [robe] } });
}

const urls = (fetchMock) => fetchMock.mock.calls.map(([url]) => url);

describe("searchItems", () => {
  it("searches items and magic items together, by name", async () => {
    const fetchMock = stubSearch();

    const found = await searchItems("ro");

    expect(found.map((item) => item.name)).toEqual(["Ring of Rope", "Robe of Eyes", "Rope"]);
    expect(urls(fetchMock).sort()).toEqual(["/api/items?name=ro&pageSize=25&sort=name", "/api/magicitems?name=ro&pageSize=25&sort=name"]);
  });

  it("keeps only the first page of the combined results", async () => {
    stubSearch();

    expect((await searchItems("ro", { pageSize: 2 })).map((item) => item.name)).toEqual(["Ring of Rope", "Robe of Eyes"]);
  });

  it("searches just one kind when asked", async () => {
    const fetchMock = stubSearch();

    await searchItems("ro", { kind: "item" });
    await searchItems("ro", { kind: "magic" });

    expect(urls(fetchMock).map((url) => url.split("?")[0])).toEqual(["/api/items", "/api/magicitems"]);
  });

  it("passes on the category, and the rarity to magic items only, which leaves out ordinary items", async () => {
    const fetchMock = stubSearch();

    await searchItems("ro", { category: "weapon", rarity: "rare" });

    expect(urls(fetchMock)).toEqual(["/api/magicitems?name=ro&pageSize=25&sort=name&category=weapon&rarity=rare"]);
  });
});

describe("listItems", () => {
  it("lists a page of the magic items, with the rarity", async () => {
    const fetchMock = stubSearch();

    await listItems({ kind: "magic", name: "ro", category: "ring", rarity: "rare", page: 2, pageSize: 50, sort: "cost,desc" });

    expect(urls(fetchMock)).toEqual(["/api/magicitems?page=2&pageSize=50&sort=cost%2Cdesc&name=ro&category=ring&rarity=rare"]);
  });

  it("lists a page of the ordinary items, which have no rarity", async () => {
    const fetchMock = stubSearch();

    await listItems({ kind: "item", name: "ro", rarity: "rare", page: 0, pageSize: 25, sort: "name,asc" });

    expect(urls(fetchMock)).toEqual(["/api/items?page=0&pageSize=25&sort=name%2Casc&name=ro"]);
  });
});
