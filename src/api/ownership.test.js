import { afterEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../test/fakeApi";
import { apiSend } from "./client";
import { deleteCreature } from "./creatures";
import { listOwnedDocumentKeys } from "./ownership";

afterEach(() => vi.unstubAllGlobals());

const documents = {
  content: [
    { key: "u1-homebrew", ownerId: 1 },
    { key: "u2-homebrew", ownerId: 2 },
    { key: "srd-2014", ownerId: null },
    { key: "no-owner-field" },
  ],
};

describe("listOwnedDocumentKeys", () => {
  it("is the documents the signed-in user owns", async () => {
    stubApi({ "GET /api/me": { id: 1, username: "dev" }, "GET /api/documents": documents });

    await expect(listOwnedDocumentKeys()).resolves.toEqual(new Set(["u1-homebrew"]));
  });

  it("is nothing when the user has no id, even for documents with no owner", async () => {
    stubApi({ "GET /api/me": { username: "nobody" }, "GET /api/documents": documents });

    await expect(listOwnedDocumentKeys()).resolves.toEqual(new Set());
  });

  it("fails when the lists can't be loaded", async () => {
    stubApi({});

    await expect(listOwnedDocumentKeys()).rejects.toThrow();
  });
});

describe("deleting", () => {
  it("sends a DELETE and copes with the empty answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(deleteCreature("u1-homebrew_gribble")).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      "/api/creatures/u1-homebrew_gribble",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("throws the backend's message when it refuses", async () => {
    const problem = { detail: "Default content can't be changed.", status: 403 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(problem), { status: 403 })));

    await expect(apiSend("DELETE", "/api/creatures/srd_goblin")).rejects.toMatchObject({
      status: 403,
      message: "Default content can't be changed.",
    });
  });
});
