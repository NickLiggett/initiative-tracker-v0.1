import { afterEach, describe, expect, it, vi } from "vitest";
import { createResourceApi } from "./resource";

afterEach(() => vi.unstubAllGlobals());

describe("createResourceApi", () => {
  const items = createResourceApi("/api/items");
  const calls = () => fetch.mock.calls.map(([url, init]) => `${init.method ?? "GET"} ${url}`);

  it("calls the collection it was made for", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response("{}")));

    await items.get("srd-2024_rope");
    await items.create({ name: "Gribble's Rope" });
    await items.replace("u1-homebrew_rope", { name: "Rope" });
    await items.copy("srd-2024_rope");

    expect(calls()).toEqual([
      "GET /api/items/srd-2024_rope",
      "POST /api/items",
      "PUT /api/items/u1-homebrew_rope",
      "POST /api/items/srd-2024_rope/copy",
    ]);
  });

  it("searches by name, sorted, with any further filters, and returns the page's content", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ key: "a" }] }))));

    await expect(items.search("rope", { category: "adventuring-gear", pageSize: 10 })).resolves.toEqual([{ key: "a" }]);
    expect(fetch.mock.calls[0][0]).toBe("/api/items?name=rope&pageSize=10&sort=name&category=adventuring-gear");
  });

  it("deletes, and copes with the empty answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(items.remove("u1-homebrew_rope")).resolves.toBeNull();
    expect(calls()).toEqual(["DELETE /api/items/u1-homebrew_rope"]);
  });
});
