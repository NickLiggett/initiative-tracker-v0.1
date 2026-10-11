import { afterEach, describe, expect, it, vi } from "vitest";
import { listFeats, searchFeats } from "./feats";
import { stubApi } from "../test/fakeApi";

afterEach(() => vi.unstubAllGlobals());

const feat = (key, name) => ({ key, name });
const paramsOf = (url) => Object.fromEntries(new URL(url, "http://backend").searchParams);

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

  it("passes the type on as it is, in one request", async () => {
    const fetchMock = stubApi({ "GET /api/feats": { content: [feat("a", "Alert")] } });

    await expect(searchFeats("", { type: "General" })).resolves.toEqual([feat("a", "Alert")]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(paramsOf(fetchMock.mock.calls[0][0])).toMatchObject({ type: "General" });
  });
});

describe("listFeats", () => {
  it("asks for a page, sorted, with the whole answer", async () => {
    const answer = { content: [feat("a", "Alert")], page: { number: 1, size: 25, totalElements: 30, totalPages: 2 } };
    const fetchMock = stubApi({ "GET /api/feats": answer });

    await expect(listFeats({ name: "a", type: "Origin", page: 1, pageSize: 25, sort: "type,desc" })).resolves.toEqual(answer);

    expect(paramsOf(fetchMock.mock.calls[0][0])).toEqual({ name: "a", type: "Origin", page: "1", pageSize: "25", sort: "type,desc" });
  });
});
