import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { stubApi } from "./test/fakeApi";
import App from "./App";

afterEach(() => vi.unstubAllGlobals());

const empty = { content: [], page: { number: 0, size: 25, totalElements: 0, totalPages: 0 } };
const aasimar = {
  key: "mine_aasimar",
  name: "Aasimar",
  isSubspecies: false,
  document: { key: "mine", name: "Mine", displayName: "Mine" },
  traits: [{ name: "Celestial Resistance", desc: "Resistance to necrotic and radiant damage.", type: null, order: 1 }],
};

function renderApp() {
  stubApi({
    "GET /api/species": { content: [aasimar], page: { number: 0, size: 25, totalElements: 1, totalPages: 1 } },
    "GET /api/items": empty,
    "GET /api/magicitems": empty,
    "GET /api/documents": { content: [] },
  });
  render(<App />);
}

const goTo = (page) => {
  fireEvent.click(screen.getByRole("button", { name: "menu" }));
  fireEvent.click(within_drawer(page));
};
const within_drawer = (page) => screen.getAllByRole("button", { name: page }).find((button) => button.closest("[role=presentation]"));
const kept = (page) => document.querySelector(`[data-page="${page}"]`);

describe("the pages of content", () => {
  it("are not loaded until opened", () => {
    renderApp();

    expect(kept("Species")).toBeNull();
    expect(kept("Items")).toBeNull();
  });

  it("stay as they were left (a result being read, for one) when the user goes to another page and back", async () => {
    renderApp();
    goTo("Species");
    const page = kept("Species");
    fireEvent.click(await screen.findByText("Aasimar")); // open it from the table
    expect(await screen.findByText("Celestial Resistance")).toBeInTheDocument();

    goTo("Items");
    expect(kept("Species")).toBe(page); // the same page, kept
    expect(kept("Species").style.display).toBe("none");
    expect(kept("Items").style.display).toBe("contents");

    goTo("Species");
    expect(kept("Species")).toBe(page);
    expect(kept("Species").style.display).toBe("contents");
    expect(kept("Items").style.display).toBe("none");
    expect(screen.getByText("Celestial Resistance")).toBeInTheDocument(); // still open, no search needed
  });

  it("leave the other pages to start fresh each time", () => {
    renderApp();

    goTo("Characters");
    expect(document.querySelector("[data-page]")).toBeNull();
  });
});
