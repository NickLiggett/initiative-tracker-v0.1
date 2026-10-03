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
  fireEvent.change(mine().getByLabelText("Share with (username)"), { target: { value: text } });
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
    expect(mine().getByLabelText("Share with (username)")).toHaveValue(""); // ready for the next one
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
    expect(mine().getByLabelText("Share with (username)")).toHaveValue("ghost"); // kept, to fix
  });

  it("won't share with the owner, someone who already has access, or nobody, and doesn't ask the backend", async () => {
    const fetchMock = await renderPage();
    const callsBefore = fetchMock.mock.calls.length;

    shareWith("");
    expect(mine().getByText("Type a username.")).toBeInTheDocument();
    shareWith("dev");
    expect(mine().getByText("That's you: you already own it.")).toBeInTheDocument();
    shareWith("Player");
    expect(mine().getByText(/^player can already see this/)).toBeInTheDocument();

    expect(fetchMock.mock.calls.length).toBe(callsBefore);
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
