import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { OWNERSHIP_ROUTES, stubApi } from "../../test/fakeApi";
import CreaturesPage from "./CreaturesPage";
import { parseChallengeRating } from "./CreatureFilters";

afterEach(() => vi.unstubAllGlobals());

const srd = { key: "srd-2014", displayName: "5e 2014 Rules", name: "System Reference Document 5.1" };

const creature = (key, name, challengeRating, type, size, armorClass, hitPoints) => ({
  key,
  name,
  challengeRating,
  type: { key: type.toLowerCase(), name: type },
  size: { key: size.toLowerCase(), name: size },
  armorClass,
  hitPoints,
  document: srd,
  abilityScores: { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 },
  actions: [],
});
const wyrmling = creature("srd_red-dragon-wyrmling", "Red Dragon Wyrmling", 4, "Dragon", "Medium", 17, 75);
const adult = creature("srd_adult-red-dragon", "Adult Red Dragon", 17, "Dragon", "Huge", 19, 256);
const kobold = creature("srd_dragonborn-kobold", "Dragon Kobold", 0.125, "Humanoid", "Small", 12, 5);
const all = [wyrmling, adult, kobold];

/** A backend that lists the creatures matching the name, type and CR range asked for, in the order and page asked for. */
function stubBackend() {
  const base = stubApi({
    ...OWNERSHIP_ROUTES,
    "GET /api/creaturetypes": { content: [{ key: "dragon", name: "Dragon" }, { key: "humanoid", name: "Humanoid" }] },
    "GET /api/sizes": { content: [{ key: "medium", name: "Medium" }, { key: "huge", name: "Huge" }] },
  });
  const searches = [];
  const fetchMock = vi.fn(async (url, init = {}) => {
    const address = new URL(url, "http://backend");
    if ((init.method ?? "GET") === "GET" && address.pathname === "/api/creatures") {
      const params = Object.fromEntries(address.searchParams);
      searches.push(params);
      let found = all.filter(
        (one) =>
          one.name.toLowerCase().includes((params.name ?? "").toLowerCase()) &&
          (!params.type || one.type.key === params.type) &&
          (!params.crMin || one.challengeRating >= Number(params.crMin)) &&
          (!params.crMax || one.challengeRating <= Number(params.crMax)),
      );
      const [field, direction] = (params.sort ?? "name,asc").split(",");
      found = [...found].sort((a, b) => (a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0) * (direction === "desc" ? -1 : 1));
      const size = Number(params.pageSize);
      const number = Number(params.page ?? 0);
      return new Response(
        JSON.stringify({ content: found.slice(number * size, (number + 1) * size), page: { number, size, totalElements: found.length, totalPages: Math.ceil(found.length / size) } }),
        { status: 200 },
      );
    }
    return base(url, init);
  });
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.searches = searches;
  return fetchMock;
}

const names = () =>
  within(screen.getByRole("table", { name: "Creature results" }))
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);

describe("listing creatures as a table", () => {
  it("lists everything called dragon, with its stats, when Search is pressed", async () => {
    const fetchMock = stubBackend();
    render(<CreaturesPage />);

    fireEvent.change(screen.getByLabelText("Name contains"), { target: { value: "dragon" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await screen.findByRole("table", { name: "Creature results" });
    expect(names()).toEqual(["Adult Red Dragon", "Dragon Kobold", "Red Dragon Wyrmling"]);
    expect(screen.getByText("3 creatures found")).toBeInTheDocument();
    const first = within(screen.getByRole("table", { name: "Creature results" })).getAllByRole("row")[1];
    expect(within(first).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["Adult Red Dragon", "17", "Dragon", "Huge", "19", "256", "5e 2014 Rules"]);
    expect(fetchMock.searches.at(-1)).toMatchObject({ name: "dragon", page: "0", pageSize: "25", sort: "name,asc" });
  });

  it("sorts by challenge rating, highest first when pressed twice", async () => {
    const fetchMock = stubBackend();
    render(<CreaturesPage />);
    fireEvent.change(screen.getByLabelText("Name contains"), { target: { value: "dragon" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByRole("table", { name: "Creature results" });

    fireEvent.click(screen.getByRole("button", { name: "CR" }));
    await waitFor(() => expect(names()).toEqual(["Dragon Kobold", "Red Dragon Wyrmling", "Adult Red Dragon"]));
    expect(screen.getByText("1/8")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "CR" }));
    await waitFor(() => expect(names()).toEqual(["Adult Red Dragon", "Red Dragon Wyrmling", "Dragon Kobold"]));
    expect(fetchMock.searches.at(-1).sort).toBe("challengeRating,desc");
  });

  it("narrows by type and a range of challenge ratings", async () => {
    const fetchMock = stubBackend();
    render(<CreaturesPage />);
    await screen.findByRole("option", { name: "Humanoid" });

    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "dragon" } });
    fireEvent.change(screen.getByLabelText("CR from"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("CR to"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await screen.findByRole("table", { name: "Creature results" });
    expect(names()).toEqual(["Red Dragon Wyrmling"]);
    expect(fetchMock.searches.at(-1)).toMatchObject({ type: "dragon", crMin: "3", crMax: "10" });
  });

  it("opens a creature's stat block from the table, and goes back to the results", async () => {
    stubBackend();
    render(<CreaturesPage />);
    fireEvent.change(screen.getByLabelText("Name contains"), { target: { value: "wyrmling" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await screen.findByRole("table", { name: "Creature results" });

    fireEvent.click(screen.getByRole("button", { name: "Open Red Dragon Wyrmling" }));

    expect(await screen.findByRole("heading", { name: "Red Dragon Wyrmling" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to results" }));
    expect(screen.getByRole("table", { name: "Creature results" })).toBeInTheDocument();
  });
});

describe("parseChallengeRating", () => {
  it("reads numbers and the fractions", () => {
    expect(parseChallengeRating("5")).toBe(5);
    expect(parseChallengeRating(" 0.5 ")).toBe(0.5);
    expect(parseChallengeRating("1/4")).toBe(0.25);
    expect(parseChallengeRating("1/8")).toBe(0.125);
  });

  it("leaves out what is blank or isn't a rating", () => {
    expect(parseChallengeRating("")).toBeUndefined();
    expect(parseChallengeRating("dragon")).toBeUndefined();
    expect(parseChallengeRating("-2")).toBeUndefined();
  });
});
