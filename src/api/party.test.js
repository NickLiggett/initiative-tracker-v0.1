import { afterEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../test/fakeApi";
import {
  acceptPartyInvitation,
  inviteToParty,
  leaveParty,
  listPartyInvitations,
  listPartyMembers,
  listPartyPlayers,
  removeFromParty,
} from "./party";

afterEach(() => vi.unstubAllGlobals());

const calls = (fetchMock) => fetchMock.mock.calls.map(([url, init]) => `${init.method ?? "GET"} ${url}`);

describe("party", () => {
  it("asks, lists and removes at the member's own address", async () => {
    const fetchMock = stubApi({
      "GET /api/party": [{ username: "anna", status: "ACCEPTED" }],
      "PUT /api/party/members/anna": { username: "anna", status: "PENDING" },
      "DELETE /api/party/members/anna": null,
    });

    await expect(listPartyMembers()).resolves.toEqual([{ username: "anna", status: "ACCEPTED" }]);
    await expect(inviteToParty("anna")).resolves.toEqual({ username: "anna", status: "PENDING" });
    await removeFromParty("anna");

    expect(calls(fetchMock)).toEqual(["GET /api/party", "PUT /api/party/members/anna", "DELETE /api/party/members/anna"]);
  });

  it("lists, accepts and leaves a DM's party", async () => {
    const fetchMock = stubApi({
      "GET /api/party/invitations": [{ dm: "gm", status: "PENDING" }],
      "POST /api/party/invitations/gm/accept": { dm: "gm", status: "ACCEPTED" },
      "DELETE /api/party/invitations/gm": null,
    });

    await expect(listPartyInvitations()).resolves.toEqual([{ dm: "gm", status: "PENDING" }]);
    await expect(acceptPartyInvitation("gm")).resolves.toEqual({ dm: "gm", status: "ACCEPTED" });
    await leaveParty("gm");

    expect(calls(fetchMock)).toEqual([
      "GET /api/party/invitations",
      "POST /api/party/invitations/gm/accept",
      "DELETE /api/party/invitations/gm",
    ]);
  });

  it("lists the party's players", async () => {
    stubApi({ "GET /api/party/players": [{ id: 1, name: "Anna's Wizard", role: "PARTY" }] });

    await expect(listPartyPlayers()).resolves.toEqual([{ id: 1, name: "Anna's Wizard", role: "PARTY" }]);
  });

  it("keeps odd characters in a username from changing the address", async () => {
    const fetchMock = stubApi({});

    await inviteToParty("a/b?c").catch(() => {});

    expect(fetchMock.mock.calls[0][0]).toBe("/api/party/members/a%2Fb%3Fc");
  });
});
