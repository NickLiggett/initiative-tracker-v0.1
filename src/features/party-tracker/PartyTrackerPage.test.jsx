import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { stubApi } from "../../test/fakeApi";
import PartyTrackerPage, { HIDDEN } from "./PartyTrackerPage";
import { POLL_MS } from "./usePartyTrackers";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const wizard = { id: 1, name: "Anna's Wizard", initiative: 18, type: "PC", playerId: 4, mine: true, ac: 12, hp: 30, revealed: false };
const goblin = { id: 2, name: "Goblin", initiative: 15, type: "Creature", playerId: null, mine: false, ac: null, hp: null, revealed: false };
const fight = (...combatants) => ({ dm: "gm", updatedAt: "2026-10-10T12:00:00Z", combatants });

describe("PartyTrackerPage", () => {
  it("shows the DM's turn order, with the first up and the user's own character marked", async () => {
    stubApi({ "GET /api/party/trackers": [fight(wizard, goblin)] });
    render(<PartyTrackerPage />);

    const table = within(await screen.findByRole("table", { name: "gm's turn order" }));
    const rows = table.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Anna's Wizard")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Up now")).toBeInTheDocument();
    expect(within(rows[0]).getByText("Yours")).toBeInTheDocument();
    expect(within(rows[0]).getByText("30")).toBeInTheDocument();
    expect(within(rows[1]).queryByText("Up now")).not.toBeInTheDocument();
    expect(within(rows[1]).queryByText("Yours")).not.toBeInTheDocument();
  });

  it("shows hidden armor class and hit points as question marks", async () => {
    stubApi({ "GET /api/party/trackers": [fight(wizard, goblin)] });
    render(<PartyTrackerPage />);

    const goblinRow = (await screen.findByText("Goblin")).closest("tr");
    expect(within(goblinRow).getAllByText(HIDDEN)).toHaveLength(2);
    expect(within(goblinRow).getByLabelText("AC hidden")).toBeInTheDocument();
    expect(within(goblinRow).getByLabelText("HP hidden")).toBeInTheDocument();
  });

  it("has nothing to edit", async () => {
    stubApi({ "GET /api/party/trackers": [fight(wizard, goblin)] });
    render(<PartyTrackerPage />);
    await screen.findByText("Goblin");

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("says so when no fight has the user's characters in it", async () => {
    stubApi({ "GET /api/party/trackers": [] });
    render(<PartyTrackerPage />);

    expect(await screen.findByText(/No DM has one of your characters in a fight/)).toBeInTheDocument();
  });

  it("asks someone not signed in to sign in", async () => {
    stubApi({ "GET /api/party/trackers": new Response(JSON.stringify({ detail: "Sign in" }), { status: 401 }) });
    render(<PartyTrackerPage />);

    expect(await screen.findByText("Sign in to see your party's tracker.")).toBeInTheDocument();
  });

  it("lets the user choose which tracker to watch when their characters are in several", async () => {
    stubApi({
      "GET /api/party/trackers": [
        { ...fight(wizard), name: "Tuesday group", live: true, trackerId: null },
        { ...fight(goblin, wizard), dm: "other", name: "Saturday group", live: false, trackerId: 7 },
      ],
    });
    render(<PartyTrackerPage />);

    expect(await screen.findByRole("table", { name: "gm's turn order" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "other's turn order" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "gm's fight: Tuesday group" })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Tracker" }));
    fireEvent.click(screen.getByRole("option", { name: "other: Saturday group (saved)" }));

    expect(screen.getByRole("table", { name: "other's turn order" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "gm's turn order" })).not.toBeInTheDocument();
    expect(screen.getByText("Saved, not live")).toBeInTheDocument();
  });

  it("offers no choice when there is only one tracker", async () => {
    stubApi({ "GET /api/party/trackers": [fight(wizard)] });
    render(<PartyTrackerPage />);

    expect(await screen.findByRole("table", { name: "gm's turn order" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Tracker" })).not.toBeInTheDocument();
  });

  it("asks again every few seconds, and shows what the DM revealed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let answer = [fight(wizard, goblin)];
    const fetchMock = stubApi({ "GET /api/party/trackers": () => answer });
    render(<PartyTrackerPage />);
    await screen.findByText("Goblin");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    answer = [fight(wizard, { ...goblin, ac: 15, hp: 7, revealed: true })];
    await act(() => vi.advanceTimersByTimeAsync(POLL_MS + 100));

    await waitFor(() => expect(within(screen.getByText("Goblin").closest("tr")).getByText("7")).toBeInTheDocument());
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
  });

  it("stops asking while the tab is hidden", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const fetchMock = stubApi({ "GET /api/party/trackers": [fight(wizard)] });
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    render(<PartyTrackerPage />);
    await screen.findByText("Anna's Wizard");
    const before = fetchMock.mock.calls.length;

    await act(() => vi.advanceTimersByTimeAsync(POLL_MS * 3));

    expect(fetchMock.mock.calls.length).toBe(before);
    hidden.mockRestore();
  });
});
