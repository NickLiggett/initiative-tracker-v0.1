import { afterEach, describe, expect, it, vi } from "vitest";
import { searchFeats, typeSpellings } from "./feats";
import { stubApi } from "../test/fakeApi";

afterEach(() => vi.unstubAllGlobals());

const feat = (key, name) => ({ key, name });
const paramsOf = (url) => Object.fromEntries(new URL(url, "http://backend").searchParams);

describe("typeSpellings", () => {
  it("gives a type as written and in capitals, once each", () => {
    expect(typeSpellings("General")).toEqual(["General", "GENERAL"]);
    expect(typeSpellings("GENERAL")).toEqual(["GENERAL"]);
  });
});

describe("searchFeats", () => {
  it("asks for the feats with that name, by name", async () => {
    const fetchMock = stubApi({ "GET /api/feats": { content: [feat("a", "Alert")] } });

    await expect(searchFeats("ale")).resolves.toEqual([feat("a", "Alert")]);

    expect(paramsOf(fetchMock.mock.calls[0][0])).toEqual({ name: "ale", pageSize: "25", sort: "name" });
  });

  it("passes the prerequisite filter on, and leaves out the ones that aren't set", async () => {
    const fetchMock = stubApi({ "GET /api/feats": { content: [] } });

    await searchFeats("", { hasPrerequisite: true });

    expect(paramsOf(fetchMock.mock.calls[0][0])).toMatchObject({ hasPrerequisite: "true" });
    expect(paramsOf(fetchMock.mock.calls[0][0])).not.toHaveProperty("type");
  });

  it("finds a type however it is capitalized: one request for each spelling, joined, each feat once, by name", async () => {
    const answers = {
      General: [feat("b_grappler", "Grappler"), feat("a_alert", "Alert")],
      GENERAL: [feat("c_actor", "Actor"), feat("a_alert", "Alert")],
    };
    const fetchMock = vi.fn(async (url) => new Response(JSON.stringify({ content: answers[paramsOf(url).type] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const found = await searchFeats("", { type: "General" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(found.map((one) => one.name)).toEqual(["Actor", "Alert", "Grappler"]);
  });
});
