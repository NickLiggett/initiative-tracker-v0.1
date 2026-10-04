import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { stubApi } from "../../test/fakeApi";
import PartyPanel from "./PartyPanel";
import PlayersPage from "./PlayersPage";

afterEach(() => vi.unstubAllGlobals());

const annaWizard = {
  id: 7,
  name: "Anna's Wizard",
  ruleset: "5e-2024",
  className: "Wizard",
  speciesName: null,
  level: 4,
  armorClass: 13,
  hitPoints: 22,
  initiativeBonus: 2,
  notes: null,
  owner: "anna",
  playedBy: null,
  role: "PARTY",
};

/** A backend with a party that has one member who accepted and one who hasn't, and a request from a DM. */
function stubParty(extra = {}) {
  let members = [
    { username: "anna", status: "ACCEPTED" },
    { username: "ben", status: "PENDING" },
  ];
  let invitations = [{ dm: "gm", status: "PENDING" }];
  const fetchMock = stubApi({
    "GET /api/party": () => members,
    "GET /api/party/invitations": () => invitations,
    "GET /api/party/players": [annaWizard],
    "PUT /api/party/members/cara": () => {
      members = [...members, { username: "cara", status: "PENDING" }];
      return { username: "cara", status: "PENDING" };
    },
    "DELETE /api/party/members/ben": () => {
      members = members.filter((member) => member.username !== "ben");
      return null;
    },
    "POST /api/party/invitations/gm/accept": () => {
      invitations = [{ dm: "gm", status: "ACCEPTED" }];
      return { dm: "gm", status: "ACCEPTED" };
    },
    "DELETE /api/party/invitations/gm": () => {
      invitations = [];
      return null;
    },
    ...extra,
  });
  return fetchMock;
}

const requests = (fetchMock, method, path) =>
  fetchMock.mock.calls.filter(([url, init = {}]) => (init.method ?? "GET") === method && url === path);

async function renderPanel(extra) {
  const fetchMock = stubParty(extra);
  render(<PartyPanel />);
  await screen.findByRole("heading", { name: "Your party" });
  return fetchMock;
}

const section = (name) => within(screen.getByRole("region", { name }));
const confirmDialog = (label) => fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: label }));

describe("what's shown", () => {
  it("lists who is in the party and who hasn't answered", async () => {
    await renderPanel();

    const people = within(screen.getByRole("list", { name: "People in your party" }));
    expect(people.getByText("anna")).toBeInTheDocument();
    expect(people.getByText("In your party")).toBeInTheDocument();
    expect(people.getByText("ben")).toBeInTheDocument();
    expect(people.getByText("Waiting for them to accept")).toBeInTheDocument();
  });

  it("shows the party's players, with nothing to change", async () => {
    await renderPanel();

    const players = within(screen.getByRole("list", { name: "Party players" }));
    const card = within(players.getByRole("group", { name: "Anna's Wizard" }));
    expect(card.getByText("Level 4 Wizard")).toBeInTheDocument();
    expect(card.getByText("Made by anna")).toBeInTheDocument();
    expect(card.queryByRole("button")).not.toBeInTheDocument();
  });

  it("says who plays a party character when that isn't whoever made it", async () => {
    await renderPanel({ "GET /api/party/players": [{ ...annaWizard, owner: "gm", playedBy: "anna" }] });

    expect(await screen.findByText("Played by anna, made by gm")).toBeInTheDocument();
  });

  it("says when there is nobody and nothing", async () => {
    stubApi({ "GET /api/party": [], "GET /api/party/invitations": [], "GET /api/party/players": [] });
    render(<PartyPanel />);

    expect(await screen.findByText("Nobody yet.")).toBeInTheDocument();
    expect(screen.getByText(/None yet. Players show up here/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Asked to join" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Parties you are in" })).not.toBeInTheDocument();
  });

  it("says when it can't load, and when nobody is signed in", async () => {
    stubApi({ "GET /api/party": () => new Response("{}", { status: 500 }) });
    const { unmount } = render(<PartyPanel />);
    expect(await screen.findByText("Couldn't load your party. Is the backend running?")).toBeInTheDocument();
    unmount();

    stubApi({ "GET /api/party": () => new Response(JSON.stringify({ detail: "Sign in" }), { status: 401 }) });
    render(<PartyPanel />);
    expect(await screen.findByText("Sign in to use a party.")).toBeInTheDocument();
  });
});

describe("asking someone to join", () => {
  it("asks by username, in lower case and without the @, and lists them as waiting", async () => {
    const fetchMock = await renderPanel();

    fireEvent.change(screen.getByLabelText("Ask to join (username)"), { target: { value: " @Cara " } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));

    const people = within(screen.getByRole("list", { name: "People in your party" }));
    expect(await people.findByText("cara")).toBeInTheDocument();
    expect(requests(fetchMock, "PUT", "/api/party/members/cara")).toHaveLength(1);
    expect(screen.getByLabelText("Ask to join (username)")).toHaveValue("");
  });

  it("won't ask nobody, or someone already there, and doesn't ask the backend", async () => {
    const fetchMock = await renderPanel();
    const callsBefore = fetchMock.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(screen.getByText("Type a username.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Ask to join (username)"), { target: { value: "Anna" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));
    expect(screen.getByText("anna is already in your party, or has been asked.")).toBeInTheDocument();

    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });

  it("says what to do when there is no such user", async () => {
    await renderPanel({
      "PUT /api/party/members/ghost": () => new Response(JSON.stringify({ detail: "No user 'ghost'" }), { status: 404 }),
    });

    fireEvent.change(screen.getByLabelText("Ask to join (username)"), { target: { value: "ghost" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("There's no user called ghost.");
    expect(screen.getByLabelText("Ask to join (username)")).toHaveValue("ghost"); // kept, to fix
  });

  it("shows the backend's reason for anything else", async () => {
    await renderPanel({
      "PUT /api/party/members/cara": () =>
        new Response(JSON.stringify({ detail: "A party can have up to 30 people; remove some first" }), { status: 400 }),
    });

    fireEvent.change(screen.getByLabelText("Ask to join (username)"), { target: { value: "cara" } });
    fireEvent.click(screen.getByRole("button", { name: "Ask" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("A party can have up to 30 people");
  });
});

describe("removing someone", () => {
  it("asks first, and then withdraws a request", async () => {
    const fetchMock = await renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Withdraw the request to ben" }));
    expect(screen.getByText("Withdraw the request to ben?")).toBeInTheDocument();
    expect(requests(fetchMock, "DELETE", "/api/party/members/ben")).toHaveLength(0);
    confirmDialog("Withdraw");

    await waitFor(() => expect(screen.queryByText("ben")).not.toBeInTheDocument());
    expect(requests(fetchMock, "DELETE", "/api/party/members/ben")).toHaveLength(1);
    expect(screen.getByText("anna")).toBeInTheDocument();
  });

  it("calls removing someone who joined removing", async () => {
    await renderPanel({ "DELETE /api/party/members/anna": null });

    fireEvent.click(screen.getByRole("button", { name: "Remove anna" }));

    expect(screen.getByText("Remove anna?")).toBeInTheDocument();
    expect(screen.getByText(/anna's players will no longer show in your party/)).toBeInTheDocument();
  });

  it("leaves the dialog and says why when that fails", async () => {
    await renderPanel({
      "DELETE /api/party/members/ben": () => new Response(JSON.stringify({ detail: "'ben' isn't in your party" }), { status: 404 }),
    });

    fireEvent.click(screen.getByRole("button", { name: "Withdraw the request to ben" }));
    confirmDialog("Withdraw");

    expect(await screen.findByRole("alert")).toHaveTextContent("'ben' isn't in your party");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("being asked to join a party", () => {
  it("shows the request, and joining moves it to the parties you're in", async () => {
    const fetchMock = await renderPanel();
    const asked = section("Asked to join");
    expect(asked.getByText(/gm asked you to join their party/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Parties you are in" })).not.toBeInTheDocument();

    fireEvent.click(asked.getByRole("button", { name: "Accept" }));

    expect(await screen.findByRole("region", { name: "Parties you are in" })).toBeInTheDocument();
    expect(section("Parties you are in").getByText("gm's party")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Asked to join" })).not.toBeInTheDocument();
    expect(requests(fetchMock, "POST", "/api/party/invitations/gm/accept")).toHaveLength(1);
  });

  it("can be turned down", async () => {
    const fetchMock = await renderPanel();

    fireEvent.click(section("Asked to join").getByRole("button", { name: "Decline" }));

    await waitFor(() => expect(screen.queryByRole("region", { name: "Asked to join" })).not.toBeInTheDocument());
    expect(requests(fetchMock, "DELETE", "/api/party/invitations/gm")).toHaveLength(1);
    expect(screen.queryByRole("region", { name: "Parties you are in" })).not.toBeInTheDocument();
  });

  it("can be left later, after asking", async () => {
    const fetchMock = await renderPanel();
    fireEvent.click(section("Asked to join").getByRole("button", { name: "Accept" }));
    await screen.findByRole("region", { name: "Parties you are in" });

    fireEvent.click(section("Parties you are in").getByRole("button", { name: "Leave" }));
    expect(screen.getByText("Leave gm's party?")).toBeInTheDocument();
    expect(requests(fetchMock, "DELETE", "/api/party/invitations/gm")).toHaveLength(0);
    confirmDialog("Leave");

    await waitFor(() => expect(screen.queryByRole("region", { name: "Parties you are in" })).not.toBeInTheDocument());
    expect(requests(fetchMock, "DELETE", "/api/party/invitations/gm")).toHaveLength(1);
  });

  it("tells the page when the requests change", async () => {
    stubParty();
    const changed = vi.fn();
    render(<PartyPanel onInvitationsChange={changed} />);
    await screen.findByRole("heading", { name: "Your party" });
    expect(changed).toHaveBeenLastCalledWith([{ dm: "gm", status: "PENDING" }]);

    fireEvent.click(section("Asked to join").getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(changed).toHaveBeenLastCalledWith([{ dm: "gm", status: "ACCEPTED" }]));
  });
});

describe("on the Players page", () => {
  it("shows how many requests are waiting on the Party tab, and opens the party", async () => {
    stubParty({ "GET /api/players": [] });
    render(<PlayersPage />);

    const tab = await screen.findByRole("tab", { name: "Party, 1 waiting" });
    expect(screen.getByRole("tab", { name: "Players" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "New player" })).toBeInTheDocument();

    fireEvent.click(tab);

    expect(await screen.findByRole("heading", { name: "Your party" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New player" })).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Your players" })).not.toBeInTheDocument();
  });

  it("has no badge when nothing is waiting, and goes back to the players", async () => {
    stubParty({ "GET /api/players": [], "GET /api/party/invitations": [] });
    render(<PlayersPage />);

    fireEvent.click(await screen.findByRole("tab", { name: "Party" }));
    await screen.findByRole("heading", { name: "Your party" });
    fireEvent.click(screen.getByRole("tab", { name: "Players" }));

    expect(await screen.findByRole("button", { name: "New player" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your party" })).not.toBeInTheDocument();
  });

  it("still shows the page when the party can't be asked about", async () => {
    stubApi({ "GET /api/players": [] }); // no party routes: 404s
    render(<PlayersPage />);

    expect(await screen.findByRole("tab", { name: "Party" })).toBeInTheDocument();
    expect(await screen.findByText("You don't have any players yet. Make one with New player.")).toBeInTheDocument();
  });
});
