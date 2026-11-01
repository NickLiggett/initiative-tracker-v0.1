import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { bodiesSentTo, stubApi } from "../../test/fakeApi";
import PlayersPage from "./PlayersPage";

afterEach(() => vi.unstubAllGlobals());

const thorin = {
  id: 1,
  name: "Thorin",
  ruleset: "5e-2014",
  className: "Fighter",
  speciesName: "Dwarf",
  level: 5,
  armorClass: 18,
  hitPoints: 52,
  initiativeBonus: 1,
  owner: "dev",
  playedBy: null,
  role: "OWNER",
};
const pip = { ...thorin, id: 2, name: "Pip", className: "Rogue", speciesName: null, level: 3, owner: "gm", playedBy: "dev", role: "PLAYER" };
const waiting = { id: 7, playerId: 1, characterName: "Thorin", email: "anna@example.com", status: "PENDING", expiresAt: "2099-01-01T00:00:00Z" };
const incoming = { id: 9, characterName: "Gimli", className: "Fighter", speciesName: "Dwarf", level: 4, owner: "gm", createdAt: "2026-10-31T00:00:00Z", expiresAt: "2099-01-01T00:00:00Z" };

async function renderPage(routes = {}, players = [thorin, pip]) {
  const fetchMock = stubApi({ "GET /api/players": players, ...routes });
  render(<PlayersPage />);
  await screen.findByRole("list", { name: "Your characters" });
  return fetchMock;
}
const card = (name) => within(screen.getByRole("group", { name }));

describe("asking someone to play", () => {
  it("emails an address, and the card says it is waiting for an answer", async () => {
    const fetchMock = await renderPage({
      "POST /api/players/1/requests": (body) => ({ ...waiting, email: body.email, emailSent: true }),
    });

    fireEvent.click(card("Thorin").getByRole("button", { name: "Request assignment" }));
    const send = screen.getByRole("button", { name: "Send request" });
    expect(send).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Their email address"), { target: { value: "Anna@Example.com" } });
    fireEvent.click(send);

    expect(await screen.findByText("Asked Anna@Example.com to play Thorin. They play it only if they accept.")).toBeInTheDocument();
    expect(bodiesSentTo(fetchMock, "POST /api/players/1/requests")).toEqual([{ email: "Anna@Example.com" }]);
    expect(card("Thorin").getByText("Waiting for Anna@Example.com to answer")).toBeInTheDocument();
  });

  it("says when the email could not be sent, which does not undo the request", async () => {
    await renderPage({ "POST /api/players/1/requests": { ...waiting, emailSent: false } });

    fireEvent.click(card("Thorin").getByRole("button", { name: "Request assignment" }));
    fireEvent.change(screen.getByLabelText("Their email address"), { target: { value: "anna@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByText(/couldn't be sent/)).toBeInTheDocument();
    expect(card("Thorin").getByText("Waiting for anna@example.com to answer")).toBeInTheDocument();
  });

  it("shows why the backend refused, and keeps the dialog", async () => {
    await renderPage({
      "POST /api/players/1/requests": () => new Response(JSON.stringify({ detail: "anna@example.com turned this request down" }), { status: 409 }),
    });

    fireEvent.click(card("Thorin").getByRole("button", { name: "Request assignment" }));
    fireEvent.change(screen.getByLabelText("Their email address"), { target: { value: "anna@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByText("anna@example.com turned this request down")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send request" })).toBeEnabled();
  });

  it("shows a waiting request and a turned-down one, and withdraws or dismisses them", async () => {
    const fetchMock = await renderPage(
      {
        "GET /api/character-requests/sent": [waiting, { ...waiting, id: 8, playerId: 3, characterName: "Aria", email: "bo@example.com", status: "DENIED" }],
        "DELETE /api/character-requests/7": new Response(null, { status: 204 }),
        "DELETE /api/character-requests/8": new Response(null, { status: 204 }),
      },
      [thorin, { ...thorin, id: 3, name: "Aria" }],
    );

    expect(await card("Thorin").findByText("Waiting for anna@example.com to answer")).toBeInTheDocument();
    expect(card("Aria").getByText("bo@example.com turned this down")).toBeInTheDocument();

    fireEvent.click(card("Thorin").getByRole("button", { name: "Withdraw" }));
    await waitFor(() => expect(card("Thorin").queryByText(/Waiting for/)).not.toBeInTheDocument());
    fireEvent.click(card("Aria").getByRole("button", { name: "Dismiss" }));
    await waitFor(() => expect(card("Aria").queryByText(/turned this down/)).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === "DELETE")).toHaveLength(2);
  });
});

describe("being asked", () => {
  it("shows who asked and about which character, and accepting brings the character in", async () => {
    let played = [thorin];
    const fetchMock = stubApi({
      "GET /api/players": () => played,
      "GET /api/character-requests/received": [incoming],
      "POST /api/character-requests/9/accept": () => {
        played = [thorin, { ...pip, id: 5, name: "Gimli" }];
        return new Response(null, { status: 204 });
      },
    });
    render(<PlayersPage />);

    const panel = await screen.findByRole("region", { name: "Requests to play a character" });
    expect(panel).toHaveTextContent("gm asked you to play Gimli");
    expect(panel).toHaveTextContent("Level 4 Fighter · Dwarf");
    fireEvent.click(within(panel).getByRole("button", { name: "Accept Gimli" }));

    await waitFor(() => expect(screen.queryByRole("region", { name: "Requests to play a character" })).not.toBeInTheDocument());
    expect(await screen.findByRole("group", { name: "Gimli" })).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url, init]) => url === "/api/character-requests/9/accept" && init.method === "POST")).toBe(true);
  });

  it("declining sends the answer and the character does not appear", async () => {
    const fetchMock = stubApi({
      "GET /api/players": [thorin],
      "GET /api/character-requests/received": [incoming],
      "POST /api/character-requests/9/deny": new Response(null, { status: 204 }),
    });
    render(<PlayersPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Decline Gimli" }));

    await waitFor(() => expect(screen.queryByRole("button", { name: "Decline Gimli" })).not.toBeInTheDocument());
    expect(screen.queryByRole("group", { name: "Gimli" })).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/character-requests/9/deny")).toBe(true);
  });

  it("says when an answer could not be sent, and keeps the request", async () => {
    stubApi({
      "GET /api/players": [thorin],
      "GET /api/character-requests/received": [incoming],
      "POST /api/character-requests/9/accept": () => new Response(JSON.stringify({ detail: "No request 9" }), { status: 404 }),
    });
    render(<PlayersPage />);

    fireEvent.click(await screen.findByRole("button", { name: "Accept Gimli" }));

    expect(await screen.findByText("Couldn't accept the request for Gimli: No request 9")).toBeInTheDocument();
  });

  it("shows nothing when there are no requests", async () => {
    await renderPage({ "GET /api/character-requests/received": [] });
    expect(screen.queryByRole("region", { name: "Requests to play a character" })).not.toBeInTheDocument();
  });
});

describe("stepping down", () => {
  it("asks first, then the character leaves the list", async () => {
    const fetchMock = await renderPage({ "POST /api/players/2/step-down": new Response(null, { status: 204 }) });

    expect(card("Thorin").queryByRole("button", { name: "Step down" })).not.toBeInTheDocument(); // not one they only play
    fireEvent.click(card("Pip").getByRole("button", { name: "Step down" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("gm keeps Pip but you stop seeing it.");
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Step down" }));

    await waitFor(() => expect(screen.queryByRole("group", { name: "Pip" })).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([url, init]) => url === "/api/players/2/step-down" && init.method === "POST")).toBe(true);
  });
});
