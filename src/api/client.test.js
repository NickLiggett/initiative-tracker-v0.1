import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiGet, buildUrl } from "./client";
import { searchCreatures } from "./creatures";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildUrl", () => {
  it("adds only the parameters that are set", () => {
    expect(buildUrl("/api/creatures", { name: "red dragon", pageSize: 25, sort: undefined, cr: "" })).toBe(
      "/api/creatures?name=red+dragon&pageSize=25",
    );
    expect(buildUrl("/api/creatures")).toBe("/api/creatures");
  });
});

describe("apiGet", () => {
  it("returns the JSON body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ key: "srd_goblin" }))));

    await expect(apiGet("/api/creatures/srd_goblin")).resolves.toEqual({ key: "srd_goblin" });
    expect(fetch).toHaveBeenCalledWith("/api/creatures/srd_goblin", expect.objectContaining({ headers: expect.any(Object) }));
  });

  it("turns problem details into an ApiError", async () => {
    const problem = { status: 404, detail: "No creature with key 'nope'" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(problem), { status: 404 })));

    const error = await apiGet("/api/creatures/nope").catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(404);
    expect(error.message).toBe("No creature with key 'nope'");
  });
});

describe("searchCreatures", () => {
  it("asks for a page of creatures by name and returns its content", async () => {
    const page = { content: [{ key: "srd_goblin", name: "Goblin" }], page: { totalElements: 1 } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(page))));

    await expect(searchCreatures("gob")).resolves.toEqual(page.content);
    expect(fetch.mock.calls[0][0]).toBe("/api/creatures?name=gob&pageSize=25&sort=name");
  });
});
