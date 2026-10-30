import { afterEach, describe, expect, it, vi } from "vitest";
import { listClasses, listSpecies } from "./reference";

afterEach(() => vi.unstubAllGlobals());

const answer = (content, number, totalPages) =>
  new Response(JSON.stringify({ content, page: { number, size: 100, totalElements: content.length, totalPages } }), { status: 200 });

describe("listSpecies", () => {
  it("fetches every page, in pages of 100, and joins them", async () => {
    const fetchMock = vi.fn(async (url) => {
      const page = Number(new URL(url, "http://x").searchParams.get("page"));
      return answer([{ key: `s${page}`, name: `Species ${page}` }], page, 3);
    });
    vi.stubGlobal("fetch", fetchMock);

    const species = await listSpecies();

    expect(species.map(({ key }) => key)).toEqual(["s0", "s1", "s2"]);
    const asked = fetchMock.mock.calls.map(([url]) => new URL(url, "http://x").searchParams);
    expect(asked.map((params) => params.get("page"))).toEqual(["0", "1", "2"]);
    expect(asked.every((params) => params.get("pageSize") === "100" && params.get("sort") === "name")).toBe(true);
  });

  it("rejects when a page can't be had, rather than giving part of the list", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", vi.fn(async () => (calls++ === 0 ? answer([{ key: "a", name: "A" }], 0, 2) : new Response("{}", { status: 500 }))));

    await expect(listSpecies()).rejects.toBeTruthy();
  });
});

describe("listClasses", () => {
  it("leaves out subclasses", async () => {
    const fetchMock = vi.fn(async () => answer([], 0, 1));
    vi.stubGlobal("fetch", fetchMock);

    await listClasses();

    expect(new URL(fetchMock.mock.calls[0][0], "http://x").searchParams.get("subclass")).toBe("false");
  });
});
