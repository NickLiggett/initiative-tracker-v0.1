import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiGet, apiSend, buildUrl } from "./client";
import { copyCreature, createCreature, replaceCreature, searchCreatures } from "./creatures";

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

describe("apiSend", () => {
  it("sends the body as JSON and returns the JSON answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ key: "dev_gribble" }), { status: 201 })));

    await expect(apiSend("POST", "/api/creatures", { name: "Gribble" })).resolves.toEqual({ key: "dev_gribble" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/creatures",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Gribble" }),
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });

  it("throws the backend's message for an error response", async () => {
    const problem = { detail: "Sign in to change content", status: 401 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(problem), { status: 401 })));

    await expect(apiSend("PUT", "/api/creatures/x", {})).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Sign in to change content",
    });
  });
});

describe("writing creatures", () => {
  it("creates, replaces and copies at the right addresses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response("{}")));

    await createCreature({ name: "Gribble" });
    await replaceCreature("dev_gribble", { name: "Gribble" });
    await copyCreature("srd_goblin");

    expect(fetch.mock.calls.map(([url, init]) => `${init.method} ${url}`)).toEqual([
      "POST /api/creatures",
      "PUT /api/creatures/dev_gribble",
      "POST /api/creatures/srd_goblin/copy",
    ]);
  });
});
