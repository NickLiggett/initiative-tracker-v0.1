import { afterEach, describe, expect, it, vi } from "vitest";
import { bodiesSentTo, stubApi } from "../test/fakeApi";
import { acceptRequest, askToPlay, cancelRequest, denyRequest, listReceivedRequests, listSentRequests } from "./characterRequests";

afterEach(() => vi.unstubAllGlobals());

const calls = (fetchMock) => fetchMock.mock.calls.map(([url, init]) => `${init.method ?? "GET"} ${url}`);

describe("character requests", () => {
  it("asks an email address on a character, and lists, withdraws, accepts and denies at the request's own address", async () => {
    const fetchMock = stubApi({
      "POST /api/players/4/requests": { id: 7, playerId: 4, emailSent: true },
      "GET /api/character-requests/sent": [{ id: 7 }],
      "DELETE /api/character-requests/7": null,
      "GET /api/character-requests/received": [{ id: 9 }],
      "POST /api/character-requests/9/accept": null,
      "POST /api/character-requests/9/deny": null,
    });

    await expect(askToPlay(4, "anna@example.com")).resolves.toMatchObject({ id: 7, emailSent: true });
    await listSentRequests();
    await cancelRequest(7);
    await listReceivedRequests();
    await acceptRequest(9);
    await denyRequest(9);

    expect(bodiesSentTo(fetchMock, "POST /api/players/4/requests")).toEqual([{ email: "anna@example.com" }]);
    expect(calls(fetchMock)).toEqual([
      "POST /api/players/4/requests",
      "GET /api/character-requests/sent",
      "DELETE /api/character-requests/7",
      "GET /api/character-requests/received",
      "POST /api/character-requests/9/accept",
      "POST /api/character-requests/9/deny",
    ]);
  });
});
