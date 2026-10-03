import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import dragon from "../../test/fixtures/adult-red-dragon.json";
import blackDragon from "../../test/fixtures/adult-black-dragon.json";
import { REFERENCE_ROUTES, bodiesSentTo, stubApi } from "../../test/fakeApi";
import CreaturesPage from "./CreaturesPage";

describe("CreaturesPage", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("prompts for a search, then shows the chosen creature's stat block", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ content: [dragon] }) })),
    );
    render(<CreaturesPage />);
    expect(screen.getByText("Search for a creature to see its stat block.")).toBeInTheDocument();

    const input = screen.getByRole("combobox", { name: "Creature" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "red dragon" } });
    fireEvent.click(await screen.findByRole("option", { name: /Adult Red Dragon/ }, { timeout: 2000 }));

    await waitFor(() => expect(screen.getByRole("heading", { name: "Adult Red Dragon" })).toBeInTheDocument());
    expect(screen.getByText("19 (natural armor)")).toBeInTheDocument();
  });

  it("compares the chosen creature with a second one, and goes back when comparing stops", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ content: [dragon, blackDragon] }) })),
    );
    render(<CreaturesPage />);
    expect(screen.getByRole("button", { name: "Compare" })).toBeDisabled();

    await pick("Creature", "dragon", /Adult Red Dragon/);
    fireEvent.click(screen.getByRole("button", { name: "Compare" }));
    expect(screen.getByText("Choose a second creature to compare with.")).toBeInTheDocument();

    await pick("Compare with", "dragon", /Adult Black Dragon/);
    const table = await screen.findByRole("table", { name: "Comparison" });
    expect(within(table).getByRole("columnheader", { name: /Adult Black Dragon/ })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: /Hit Points.*256.*\+3.*253/ })).toBeInTheDocument();
    expect(within(table).getByRole("row", { name: /Strength.*27 \(\+8\).*\+5.*22 \(\+6\)/ })).toBeInTheDocument();
    expect(screen.getAllByText("shared").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Stop comparing" }));
    expect(screen.queryByRole("table", { name: "Comparison" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Adult Red Dragon" })).toBeInTheDocument();
  });

  it("opens an empty editor for a new creature, and goes back on cancel", async () => {
    stubApi({ ...REFERENCE_ROUTES });
    render(<CreaturesPage />);

    fireEvent.click(screen.getByRole("button", { name: "New creature" }));
    expect(screen.getByRole("heading", { name: "New creature" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Creature" })).not.toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/conditions"), expect.anything())); // the lists have loaded

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("combobox", { name: "Creature" })).toBeInTheDocument();
  });

  it("shows a new creature's stat block once it's saved", async () => {
    stubApi({
      ...REFERENCE_ROUTES,
      "POST /api/creatures": (body) => ({ ...body, key: "dev_gribble", document: { displayName: "Dev's homebrew" } }),
    });
    render(<CreaturesPage />);

    fireEvent.click(screen.getByRole("button", { name: "New creature" }));
    fireEvent.change(await screen.findByLabelText(/^Creature name/), { target: { value: "Gribble" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("button", { name: "Duplicate" }); // back from the editor, which has its own preview
    expect(screen.getByRole("heading", { name: "Gribble" })).toBeInTheDocument();
    expect(screen.getByText("Dev's homebrew")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "New creature" })).not.toBeInTheDocument();
  });

  it("duplicates the chosen creature into an editor that remembers where it came from", async () => {
    const copy = { ...dragon, key: "dev_adult-red-dragon", derivedFrom: dragon.key };
    const fetchMock = stubApi({
      "GET /api/creatures": { content: [dragon] },
      ...REFERENCE_ROUTES,
      [`POST /api/creatures/${dragon.key}/copy`]: copy,
      "PUT /api/creatures/dev_adult-red-dragon": (body) => body,
    });
    render(<CreaturesPage />);
    expect(screen.getByRole("button", { name: "Duplicate" })).toBeDisabled();

    await pick("Creature", "red", /Adult Red Dragon/);
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));

    expect(await screen.findByRole("heading", { name: "Edit Adult Red Dragon" })).toBeInTheDocument();
    expect(screen.getByText(`Based on ${dragon.key}`)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Creature name/)).toHaveValue("Adult Red Dragon");

    fireEvent.change(screen.getByLabelText(/^Creature name/), { target: { value: "Elder Red Dragon" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await screen.findByRole("button", { name: "Duplicate" });
    expect(screen.getByRole("heading", { name: "Elder Red Dragon" })).toBeInTheDocument();
    expect(bodiesSentTo(fetchMock, "PUT /api/creatures/dev_adult-red-dragon")[0]).toMatchObject({ name: "Elder Red Dragon" });
  });

  it("says so when a creature can't be duplicated", async () => {
    stubApi({ "GET /api/creatures": { content: [dragon] } }); // no route for the copy: a 404
    render(<CreaturesPage />);

    await pick("Creature", "red", /Adult Red Dragon/);
    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't duplicate Adult Red Dragon");
    expect(screen.getByRole("heading", { name: "Adult Red Dragon" })).toBeInTheDocument();
  });
});

/** Types into the search with this label and picks the matching option. */
async function pick(label, text, optionName) {
  const input = screen.getByRole("combobox", { name: label });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(await screen.findByRole("option", { name: optionName }, { timeout: 2000 }));
}
