import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import dragon from "../../test/fixtures/adult-red-dragon.json";
import blackDragon from "../../test/fixtures/adult-black-dragon.json";
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
});

/** Types into the search with this label and picks the matching option. */
async function pick(label, text, optionName) {
  const input = screen.getByRole("combobox", { name: label });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(await screen.findByRole("option", { name: optionName }, { timeout: 2000 }));
}
