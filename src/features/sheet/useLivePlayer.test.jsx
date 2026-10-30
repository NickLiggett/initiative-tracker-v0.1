import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { stubApi } from "../../test/fakeApi";
import useLivePlayer, { POLL_MS } from "./useLivePlayer";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const gets = (fetchMock) => fetchMock.mock.calls.filter(([url, init = {}]) => (init.method ?? "GET") === "GET" && url === "/api/players/7").length;
const refocus = () =>
  act(() => {
    window.dispatchEvent(new Event("focus"));
  });

describe("a character kept as they are now", () => {
  it("loads them", async () => {
    stubApi({ "GET /api/players/7": { id: 7, name: "Thorin" } });

    const { result } = renderHook(() => useLivePlayer(7));

    await waitFor(() => expect(result.current.player).toEqual({ id: 7, name: "Thorin" }));
  });

  it("looks again when the tab comes back into view", async () => {
    const fetchMock = stubApi({ "GET /api/players/7": { id: 7, name: "Thorin" } });
    const { result } = renderHook(() => useLivePlayer(7));
    await waitFor(() => expect(result.current.player).not.toBeNull());

    refocus();

    await waitFor(() => expect(gets(fetchMock)).toBe(2));
  });

  it("looks again every so often, and shows what it finds", async () => {
    let hp = 40;
    const fetchMock = stubApi({ "GET /api/players/7": () => ({ id: 7, name: "Thorin", hp }) });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderHook(() => useLivePlayer(7, { pollMs: POLL_MS }));
    await waitFor(() => expect(result.current.player?.hp).toBe(40));

    hp = 25; // changed somewhere else
    await act(() => vi.advanceTimersByTimeAsync(POLL_MS + 10));

    await waitFor(() => expect(result.current.player.hp).toBe(25));
    expect(gets(fetchMock)).toBeGreaterThanOrEqual(2);
  });

  it("keeps the last it had through a failed look, and says so when the character is gone", async () => {
    let answer = { id: 7, name: "Thorin" };
    stubApi({ "GET /api/players/7": () => answer });
    const { result } = renderHook(() => useLivePlayer(7));
    await waitFor(() => expect(result.current.player).not.toBeNull());

    answer = new Response(JSON.stringify({ detail: "boom" }), { status: 500 });
    refocus();
    await waitFor(() => expect(result.current.error).toBe("Couldn't load this character."));
    expect(result.current.player.name).toBe("Thorin");

    answer = new Response(JSON.stringify({ detail: "No player 7" }), { status: 404 });
    refocus();
    await waitFor(() => expect(result.current.player).toBeNull());
    expect(result.current.error).toMatch(/isn't there/);
  });
});
