import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { OWNERSHIP_ROUTES, bodiesSentTo, stubApi } from "../../test/fakeApi";
import SharingPage from "./SharingPage";

afterEach(() => vi.unstubAllGlobals());

const documents = {
  content: [
    { key: "u1-homebrew", name: "dev's homebrew", displayName: "dev's homebrew", ownerId: 1 },
    { key: "u3-campaign", name: "GM's campaign", displayName: "GM's campaign", ownerId: 3 },
    { key: "srd-2014", name: "SRD", ownerId: null },
  ],
};

function stubBackend(extra = {}) {
  return stubApi({
    ...OWNERSHIP_ROUTES,
    "GET /api/documents": documents,
    "GET /api/documents/u1-homebrew/members": [
      { username: "dev", role: "OWNER" },
      { username: "player", role: "VIEWER" },
    ],
    ...extra,
  });
}

const mine = () => within(screen.getByRole("group", { name: "dev's homebrew" }));
const people = () => within(mine().getByRole("list", { name: "People" }));

async function renderPage(extra) {
  const fetchMock = stubBackend(extra);
  render(<SharingPage />);
  await screen.findByRole("group", { name: "dev's homebrew" });
  return fetchMock;
}

const shareWith = (text) => {
  fireEvent.change(mine().getByLabelText("Share with (username or email)"), { target: { value: text } });
  fireEvent.click(mine().getByRole("button", { name: "Share" }));
};

describe("what's shown", () => {
  it("lists the user's homebrew with who it's shared with, and what's shared with them", async () => {
    await renderPage();

    expect(people().getByText("dev")).toBeInTheDocument();
    expect(people().getByText("(you)")).toBeInTheDocument();
    expect(people().getByText("Owner")).toBeInTheDocument();
    expect(people().getByText("player")).toBeInTheDocument();
    expect(people().getByLabelText("What player can do")).toHaveValue("VIEWER");

    const shared = within(screen.getByRole("region", { name: "Shared with you" }));
    expect(shared.getByText("GM's campaign")).toBeInTheDocument();
    expect(shared.getByText("Shared by gm")).toBeInTheDocument();
    expect(shared.getByText("Can edit")).toBeInTheDocument();
  });

  it("shows the pictures of the people, from their accounts", async () => {
    await renderPage();

    // another person's picture is asked for by username, and their letter is what shows if they have none
    expect(people().getByRole("img", { name: "player's picture" })).toHaveAttribute("src", "/api/users/player/avatar");
    expect(within(screen.getByRole("region", { name: "Shared with you" })).getByRole("img", { name: "gm's picture" })).toHaveAttribute(
      "src",
      "/api/users/gm/avatar",
    );
  });

  it("says when nothing is shared either way", async () => {
    stubApi({
      ...OWNERSHIP_ROUTES,
      "GET /api/documents": { content: [{ key: "u1-homebrew", displayName: "dev's homebrew", ownerId: 1 }] },
      "GET /api/documents/u1-homebrew/members": [{ username: "dev", role: "OWNER" }],
    });
    render(<SharingPage />);

    expect(await screen.findByText("Not shared with anyone yet.")).toBeInTheDocument();
    expect(screen.getByText("Nobody has shared anything with you yet.")).toBeInTheDocument();
  });

  it("says when there's no homebrew yet", async () => {
    stubApi({ ...OWNERSHIP_ROUTES, "GET /api/documents": { content: [] } });
    render(<SharingPage />);

    expect(await screen.findByText(/You haven't made any homebrew yet/)).toBeInTheDocument();
  });

  it("asks to sign in when nobody is", async () => {
    stubApi({ ...OWNERSHIP_ROUTES, "GET /api/me": { username: "anonymous" } });
    render(<SharingPage />);

    expect(await screen.findByText("Sign in to share your homebrew.")).toBeInTheDocument();
  });

  it("says when it can't load", async () => {
    stubApi({});
    render(<SharingPage />);

    expect(await screen.findByText("Couldn't load your documents. Is the backend running?")).toBeInTheDocument();
  });
});

describe("sharing", () => {
  it("shares with someone by username, in lower case and without the @, with the role chosen", async () => {
    const fetchMock = await renderPage({
      "PUT /api/documents/u1-homebrew/members/friend": (body) => ({ username: "friend", role: body.role }),
    });
    fireEvent.change(mine().getByLabelText("They can"), { target: { value: "EDITOR" } });

    shareWith("  @Friend ");

    await waitFor(() => expect(people().getByText("friend")).toBeInTheDocument());
    expect(people().getByLabelText("What friend can do")).toHaveValue("EDITOR");
    expect(bodiesSentTo(fetchMock, "PUT /api/documents/u1-homebrew/members/friend")).toEqual([{ role: "EDITOR" }]);
    expect(mine().getByLabelText("Share with (username or email)")).toHaveValue(""); // ready for the next one
  });

  it("says what to do when there is no such user", async () => {
    await renderPage({
      "PUT /api/documents/u1-homebrew/members/ghost": () =>
        new Response(JSON.stringify({ detail: "No user 'ghost'" }), { status: 404 }),
    });

    shareWith("ghost");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "There's no user called ghost. They need to have signed in to the app once before you can share with them.",
    );
    expect(people().queryByText("ghost")).not.toBeInTheDocument();
    expect(mine().getByLabelText("Share with (username or email)")).toHaveValue("ghost"); // kept, to fix
  });

  it("won't share with the owner, someone who already has access, or nobody, and doesn't ask the backend", async () => {
    const fetchMock = await renderPage();
    const callsBefore = fetchMock.mock.calls.length;

    shareWith("");
    expect(mine().getByText("Type a username or an email address.")).toBeInTheDocument();
    shareWith("dev");
    expect(mine().getByText("That's you: you already own it.")).toBeInTheDocument();
    shareWith("Player");
    expect(mine().getByText(/^player can already see this/)).toBeInTheDocument();

    expect(fetchMock.mock.calls.length).toBe(callsBefore);
  });
});

describe("inviting an email address", () => {
  const pending = { id: 7, email: "old@example.com", role: "VIEWER", invitedBy: "dev" };

  it("lists the pending invitations, which can be cancelled", async () => {
    const fetchMock = await renderPage({
      "GET /api/documents/u1-homebrew/invitations": [pending],
      "DELETE /api/documents/u1-homebrew/invitations/7": null,
    });
    const invited = within(mine().getByRole("list", { name: "Invited" }));
    expect(invited.getByText("old@example.com")).toBeInTheDocument();
    expect(invited.getByText("Can view")).toBeInTheDocument();

    fireEvent.click(invited.getByRole("button", { name: "Cancel invitation to old@example.com" }));

    await waitFor(() => expect(mine().queryByRole("list", { name: "Invited" })).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([url, init]) => url === "/api/documents/u1-homebrew/invitations/7" && init.method === "DELETE")).toBe(true);
  });

  it("invites an address, in lower case, with the role chosen, and shows it as pending", async () => {
    let invitations = [];
    const fetchMock = await renderPage({
      "GET /api/documents/u1-homebrew/invitations": () => invitations,
      "POST /api/documents/u1-homebrew/invitations": (body) => {
        invitations = [{ id: 8, email: body.email, role: body.role, invitedBy: "dev" }];
        return { email: body.email, role: body.role, username: null, emailSent: true };
      },
    });
    fireEvent.change(mine().getByLabelText("They can"), { target: { value: "EDITOR" } });

    shareWith("  New.Friend@Example.COM ");

    expect(await screen.findByText("Invited new.friend@example.com. They get access when they sign in with that address.")).toBeInTheDocument();
    expect(bodiesSentTo(fetchMock, "POST /api/documents/u1-homebrew/invitations")).toEqual([
      { email: "new.friend@example.com", role: "EDITOR" },
    ]);
    const invited = within(mine().getByRole("list", { name: "Invited" }));
    expect(invited.getByText("new.friend@example.com")).toBeInTheDocument();
    expect(invited.getByText("Can edit")).toBeInTheDocument();
    expect(mine().getByLabelText("Share with (username or email)")).toHaveValue("");
    expect(bodiesSentTo(fetchMock, "PUT /api/documents/u1-homebrew/members/new.friend@example.com")).toEqual([]); // not as a username
  });

  it("says when the email couldn't be sent, but the invitation is kept", async () => {
    await renderPage({
      "GET /api/documents/u1-homebrew/invitations": [{ id: 9, email: "a@example.com", role: "VIEWER", invitedBy: "dev" }],
      "POST /api/documents/u1-homebrew/invitations": () => ({ email: "a@example.com", role: "VIEWER", username: null, emailSent: false }),
    });

    shareWith("a@example.com");

    expect(await screen.findByText(/Invited a@example.com, but the email couldn't be sent/)).toBeInTheDocument();
    expect(within(mine().getByRole("list", { name: "Invited" })).getByText("a@example.com")).toBeInTheDocument();
  });

  it("adds the person straight away when the address already belongs to a user", async () => {
    await renderPage({
      "POST /api/documents/u1-homebrew/invitations": () => ({ email: "pat@example.com", role: "EDITOR", username: "pat", emailSent: false }),
    });

    shareWith("pat@example.com");

    expect(await screen.findByText("pat@example.com already has an account, so pat can see it now.")).toBeInTheDocument();
    expect(people().getByText("pat")).toBeInTheDocument();
    expect(people().getByLabelText("What pat can do")).toHaveValue("EDITOR");
    expect(mine().queryByRole("list", { name: "Invited" })).not.toBeInTheDocument();
  });

  it("shows why the backend refused", async () => {
    await renderPage({
      "POST /api/documents/u1-homebrew/invitations": () =>
        new Response(JSON.stringify({ detail: "A document can have up to 50 pending invitations; cancel some first" }), { status: 400 }),
    });

    shareWith("late@example.com");

    expect(await screen.findByRole("alert")).toHaveTextContent("A document can have up to 50 pending invitations");
    expect(mine().getByLabelText("Share with (username or email)")).toHaveValue("late@example.com"); // kept, to fix
  });

  it("still shows the page when the backend can't list invitations", async () => {
    await renderPage(); // no invitations route: a 404

    expect(mine().queryByRole("list", { name: "Invited" })).not.toBeInTheDocument();
    expect(people().getByText("player")).toBeInTheDocument();
  });
});

describe("changing who can do what", () => {
  it("changes someone's role", async () => {
    const fetchMock = await renderPage({
      "PUT /api/documents/u1-homebrew/members/player": (body) => ({ username: "player", role: body.role }),
    });

    fireEvent.change(people().getByLabelText("What player can do"), { target: { value: "EDITOR" } });

    await waitFor(() => expect(bodiesSentTo(fetchMock, "PUT /api/documents/u1-homebrew/members/player")).toEqual([{ role: "EDITOR" }]));
    expect(people().getByLabelText("What player can do")).toHaveValue("EDITOR");
  });

  it("shows what it really is when the change fails", async () => {
    await renderPage({
      "PUT /api/documents/u1-homebrew/members/player": () => new Response(JSON.stringify({ detail: "Only the owner can do that" }), { status: 403 }),
    });

    fireEvent.change(people().getByLabelText("What player can do"), { target: { value: "EDITOR" } });

    expect(await screen.findByRole("alert")).toHaveTextContent("Only the owner can do that");
    await waitFor(() => expect(people().getByLabelText("What player can do")).toHaveValue("VIEWER"));
  });
});

describe("stopping sharing", () => {
  it("asks first, and then stops sharing with them", async () => {
    const fetchMock = await renderPage({ "DELETE /api/documents/u1-homebrew/members/player": null });

    fireEvent.click(people().getByRole("button", { name: "Stop sharing with player" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Stop sharing with player?")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(people().getByText("player")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/members/player"), expect.objectContaining({ method: "DELETE" }));

    fireEvent.click(people().getByRole("button", { name: "Stop sharing with player" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Stop sharing" }));

    await waitFor(() => expect(people().queryByText("player")).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/documents/u1-homebrew/members/player", expect.objectContaining({ method: "DELETE" }));
    expect(mine().getByText("Not shared with anyone yet.")).toBeInTheDocument();
  });
});

describe("documents shared with the user", () => {
  it("can be left, after asking", async () => {
    const fetchMock = await renderPage({ "DELETE /api/documents/u3-campaign/members/dev": null });
    const shared = () => within(screen.getByRole("region", { name: "Shared with you" }));

    fireEvent.click(shared().getByRole("button", { name: "Leave" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Leave GM's campaign?")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Leave" }));

    expect(await screen.findByText("Nobody has shared anything with you yet.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/documents/u3-campaign/members/dev", expect.objectContaining({ method: "DELETE" }));
  });

  it("stays if leaving fails", async () => {
    await renderPage(); // no route for the DELETE: a 404
    const shared = within(screen.getByRole("region", { name: "Shared with you" }));

    fireEvent.click(shared.getByRole("button", { name: "Leave" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Leave" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(shared.getByText("GM's campaign")).toBeInTheDocument();
  });
});
