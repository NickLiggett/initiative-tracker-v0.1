import { afterEach, describe, expect, it, vi } from "vitest";
import { OWNERSHIP_ROUTES, stubApi } from "../test/fakeApi";
import { listMembers, shareDocument, unshareDocument } from "./documents";
import { listWritableDocumentKeys } from "./ownership";
import { loadSharing } from "./sharing";

afterEach(() => vi.unstubAllGlobals());

const calls = (fetchMock) => fetchMock.mock.calls.map(([url, init]) => `${init.method ?? "GET"} ${url}`);

describe("documents", () => {
  it("lists a document's members", async () => {
    stubApi({ "GET /api/documents/u1-homebrew/members": [{ username: "dev", role: "OWNER" }] });

    await expect(listMembers("u1-homebrew")).resolves.toEqual([{ username: "dev", role: "OWNER" }]);
  });

  it("shares with a role, and stops sharing, at the member's own address", async () => {
    const fetchMock = stubApi({
      "PUT /api/documents/u1-homebrew/members/friend-2": (body) => ({ username: "friend-2", role: body.role }),
      "DELETE /api/documents/u1-homebrew/members/friend-2": null,
    });

    await expect(shareDocument("u1-homebrew", "friend-2", "EDITOR")).resolves.toEqual({ username: "friend-2", role: "EDITOR" });
    await unshareDocument("u1-homebrew", "friend-2");

    expect(calls(fetchMock)).toEqual([
      "PUT /api/documents/u1-homebrew/members/friend-2",
      "DELETE /api/documents/u1-homebrew/members/friend-2",
    ]);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ role: "EDITOR" });
  });

  it("keeps odd characters in a username from changing the address", async () => {
    const fetchMock = stubApi({});

    await shareDocument("u1-homebrew", "a/b?c", "VIEWER").catch(() => {});

    expect(fetchMock.mock.calls[0][0]).toBe("/api/documents/u1-homebrew/members/a%2Fb%3Fc");
  });
});

describe("listWritableDocumentKeys", () => {
  it("is the user's own documents and those they edit, but not those they only view", async () => {
    stubApi(OWNERSHIP_ROUTES);

    await expect(listWritableDocumentKeys()).resolves.toEqual(new Set(["u1-homebrew", "u3-campaign"]));
  });

  it("leaves out a shared document whose members can't be read", async () => {
    stubApi({ ...OWNERSHIP_ROUTES, "GET /api/documents/u3-campaign/members": () => new Response("{}", { status: 500 }) });

    await expect(listWritableDocumentKeys()).resolves.toEqual(new Set(["u1-homebrew"]));
  });

  it("only looks up the members of other users' documents", async () => {
    const fetchMock = stubApi(OWNERSHIP_ROUTES);

    await listWritableDocumentKeys();

    expect(calls(fetchMock).filter((call) => call.includes("/members")).sort()).toEqual([
      "GET /api/documents/u2-homebrew/members",
      "GET /api/documents/u3-campaign/members",
    ]);
  });
});

describe("loadSharing", () => {
  it("gathers what the user owns, with who it's shared with, and what's shared with them", async () => {
    stubApi({
      ...OWNERSHIP_ROUTES,
      "GET /api/documents/u1-homebrew/members": [
        { username: "dev", role: "OWNER" },
        { username: "player", role: "VIEWER" },
      ],
    });

    const { me, owned, shared } = await loadSharing();

    expect(me).toEqual({ id: 1, username: "dev" });
    expect(owned).toHaveLength(1);
    expect(owned[0].document.key).toBe("u1-homebrew");
    expect(owned[0].members.map((member) => member.username)).toEqual(["dev", "player"]);
    expect(shared.map(({ document, owner, role }) => [document.key, owner, role])).toEqual([
      ["u2-homebrew", "snarl", "VIEWER"],
      ["u3-campaign", "gm", "EDITOR"],
    ]);
  });

  it("has nothing when nobody is signed in", async () => {
    stubApi({ ...OWNERSHIP_ROUTES, "GET /api/me": { username: "anonymous" } });

    await expect(loadSharing()).resolves.toEqual({ me: null, owned: [], shared: [] });
  });

  it("shows a document whose members can't be read, without them", async () => {
    stubApi({ ...OWNERSHIP_ROUTES, "GET /api/documents/u3-campaign/members": () => new Response("{}", { status: 500 }) });

    const { shared } = await loadSharing();

    expect(shared.find(({ document }) => document.key === "u3-campaign")).toMatchObject({ members: [], owner: null, role: null });
  });
});
