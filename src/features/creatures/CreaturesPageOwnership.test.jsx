import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import dragon from "../../test/fixtures/adult-red-dragon.json";
import { OWNERSHIP_ROUTES, REFERENCE_ROUTES, bodiesSentTo, stubApi } from "../../test/fakeApi";
import CreaturesPage from "./CreaturesPage";

afterEach(() => vi.unstubAllGlobals());

const mine = { ...dragon, key: "u1-homebrew_gribble", name: "Gribble", document: { key: "u1-homebrew", displayName: "dev's homebrew" } };
const theirs = { ...dragon, key: "u2-homebrew_snarl", name: "Snarl", document: { key: "u2-homebrew", displayName: "other's homebrew" } };

/** The backend with three creatures to find: a source one, one the user owns, and another user's. */
function stubBackend(extra = {}) {
  return stubApi({
    ...REFERENCE_ROUTES,
    ...OWNERSHIP_ROUTES,
    "GET /api/creatures": { content: [dragon, mine, theirs] },
    ...extra,
  });
}

async function pick(name) {
  const input = screen.getByRole("combobox", { name: "Creature" });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: name } });
  fireEvent.click(await screen.findByRole("option", { name: new RegExp(name) }, { timeout: 2000 }));
}

describe("changing your own creatures", () => {
  it("offers Edit and Delete only for creatures in a document the user owns", async () => {
    stubBackend();
    render(<CreaturesPage />);

    await pick("Gribble");
    expect(await screen.findByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();

    await pick("Snarl"); // another user's homebrew
    await screen.findByRole("heading", { name: "Snarl" });
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();

    await pick("Adult Red Dragon"); // default content
    await screen.findByRole("heading", { name: "Adult Red Dragon" });
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("offers neither when it can't tell who the user is", async () => {
    stubBackend({ "GET /api/me": () => ({ detail: "nope" }) });
    render(<CreaturesPage />);

    await pick("Gribble");
    await screen.findByRole("heading", { name: "Gribble" });
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("edits the creature in the editor and shows it saved", async () => {
    const fetchMock = stubBackend({ "PUT /api/creatures/u1-homebrew_gribble": (body) => body });
    render(<CreaturesPage />);

    await pick("Gribble");
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    expect(screen.getByRole("heading", { name: "Edit Gribble" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Creature name/), { target: { value: "Gribble the Great" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("button", { name: "Duplicate" }); // back from the editor
    expect(screen.getByRole("heading", { name: "Gribble the Great" })).toBeInTheDocument();
    expect(bodiesSentTo(fetchMock, "PUT /api/creatures/u1-homebrew_gribble")[0]).toMatchObject({ name: "Gribble the Great" });
  });

  it("asks before deleting, and then deletes", async () => {
    const fetchMock = stubBackend({ "DELETE /api/creatures/u1-homebrew_gribble": null });
    render(<CreaturesPage />);
    await pick("Gribble");

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Delete Gribble?")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("u1-homebrew_gribble"), expect.objectContaining({ method: "DELETE" }));
    expect(screen.getByRole("heading", { name: "Gribble" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Search for a creature to see its stat block.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/creatures/u1-homebrew_gribble",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("keeps the creature and says why when it can't be deleted", async () => {
    stubBackend(); // no route for the DELETE: a 404
    render(<CreaturesPage />);
    await pick("Gribble");

    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't delete Gribble");
    expect(screen.getByRole("heading", { name: "Gribble" })).toBeInTheDocument();
  });

  it("offers Edit for a creature just made, which may be the first in their homebrew", async () => {
    let madeSomething = false;
    stubBackend({
      "GET /api/documents": () => ({ content: madeSomething ? [{ key: "u1-homebrew", ownerId: 1 }] : [] }),
      "POST /api/creatures": (body) => {
        madeSomething = true;
        return { ...body, key: "u1-homebrew_new", document: { key: "u1-homebrew", displayName: "dev's homebrew" } };
      },
    });
    render(<CreaturesPage />);

    fireEvent.click(screen.getByRole("button", { name: "New creature" }));
    fireEvent.change(await screen.findByLabelText(/^Creature name/), { target: { value: "Fresh" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Fresh" })).toBeInTheDocument();
  });
});
