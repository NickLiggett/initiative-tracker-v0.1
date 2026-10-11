import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { OWNERSHIP_ROUTES, stubApi } from "../../test/fakeApi";
import FeatsPage from "./FeatsPage";

afterEach(() => vi.unstubAllGlobals());

const srd = { key: "srd-2024", displayName: "5e 2024 Rules", name: "System Reference Document 5.2" };

const feat = (key, name, type, prerequisite = null) => ({
  key,
  name,
  type,
  hasPrerequisite: prerequisite !== null,
  prerequisite,
  desc: "",
  document: srd,
  benefits: [{ desc: `${name} helps.` }],
});
const alert = feat("srd-2024_alert", "Alert", "ORIGIN");
const grappler = feat("srd-2024_grappler", "Grappler", "GENERAL", "Strength or Dexterity 13 or higher");
const tough = feat("srd-2024_tougher", "Tougher", "General");
const all = [alert, grappler, tough];

/** A backend that lists the feats the way the real one pages and sorts them, matching a type in any case. */
function stubBackend() {
  const base = stubApi({ ...OWNERSHIP_ROUTES });
  const searches = [];
  const fetchMock = vi.fn(async (url, init = {}) => {
    const address = new URL(url, "http://backend");
    if ((init.method ?? "GET") === "GET" && address.pathname === "/api/feats" && address.searchParams.has("page")) {
      const params = Object.fromEntries(address.searchParams);
      searches.push(params);
      const found = all.filter(
        (one) =>
          one.name.toLowerCase().includes((params.name ?? "").toLowerCase()) &&
          (!params.type || one.type.toLowerCase() === params.type.toLowerCase()) &&
          (!params.hasPrerequisite || String(one.hasPrerequisite) === params.hasPrerequisite),
      );
      const [field, direction] = params.sort.split(",");
      const sorted = [...found].sort((a, b) => String(a[field]).localeCompare(String(b[field])) * (direction === "desc" ? -1 : 1));
      return new Response(JSON.stringify({ content: sorted, page: { number: 0, size: Number(params.pageSize), totalElements: sorted.length, totalPages: 1 } }), { status: 200 });
    }
    return base(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.searches = searches;
  return fetchMock;
}

const names = () =>
  within(screen.getByRole("table", { name: "Feat results" }))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);

describe("listing feats as a table", () => {
  it("lists the feats of a type however the data capitalizes it, with their prerequisite and source", async () => {
    const fetchMock = stubBackend();
    render(<FeatsPage />);

    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "General" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await screen.findByRole("table", { name: "Feat results" });
    expect(names()).toEqual(["Grappler", "Tougher"]);
    const first = within(screen.getByRole("table", { name: "Feat results" })).getAllByRole("row")[1];
    expect(within(first).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([
      "Grappler", "General", "Strength or Dexterity 13 or higher", "5e 2024 Rules",
    ]);
    const asked = fetchMock.searches.filter((search) => search.type);
    expect(asked).toHaveLength(2); // the filter re-lists at once, and Search again: one request each, not one for each spelling
    expect(asked.every((search) => search.type === "General" && search.sort === "name,asc")).toBe(true);
  });

  it("lists only the feats with a prerequisite, and sorts by type", async () => {
    const fetchMock = stubBackend();
    render(<FeatsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Has a prerequisite" }));
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByRole("table", { name: "Feat results" });
    expect(names()).toEqual(["Grappler"]);

    fireEvent.click(screen.getByRole("button", { name: "Type" }));

    await waitFor(() => expect(fetchMock.searches.at(-1)).toMatchObject({ hasPrerequisite: "true", sort: "type,asc" }));
  });

  it("opens a feat from the table, and goes back to the results", async () => {
    stubBackend();
    render(<FeatsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByRole("table", { name: "Feat results" });

    fireEvent.click(screen.getByRole("button", { name: "Open Alert" }));

    expect(await screen.findByRole("heading", { name: "Alert" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to results" }));
    expect(screen.getByRole("table", { name: "Feat results" })).toBeInTheDocument();
    expect(names()).toHaveLength(3);
  });
});
