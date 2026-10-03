import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import dragon from "../../test/fixtures/adult-red-dragon.json";
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
});
