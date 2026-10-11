import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import ResultsSearch from "./ResultsSearch";

const columns = [
  { key: "name", label: "Name", sortField: "name", render: (one) => one.name },
  { key: "level", label: "Level", sortField: "level", render: (one) => one.level },
  { key: "school", label: "School", render: (one) => one.school },
];

const row = (key, name, level = 1) => ({ key, name, level, school: "Divination" });
const answer = (content, { number = 0, totalElements = content.length } = {}) => ({
  content,
  page: { number, size: 25, totalElements, totalPages: Math.ceil(totalElements / 25) },
});

/** A `list` that records what it was asked and answers with what `answers` says for that request. */
function stubList(answers = () => answer([row("a", "Augury")])) {
  return vi.fn(async (request) => answers(request));
}

const renderSearch = (list, props = {}) =>
  render(<ResultsSearch noun="spell" plural="spells" list={list} filterCriteria={{ school: "divination" }} columns={columns} onOpen={() => {}} {...props} />);

const search = () => fireEvent.click(screen.getByRole("button", { name: "Search" }));

describe("ResultsSearch", () => {
  it("asks for nothing until Search is pressed, then lists every match with the count", async () => {
    const list = stubList(() => answer([row("a", "Augury", 2), row("b", "Divination", 4)], { totalElements: 2 }));
    renderSearch(list);

    expect(list).not.toHaveBeenCalled();
    expect(screen.getByText("Press Search to list the spells that match, or choose one above.")).toBeInTheDocument();

    search();

    const table = within(await screen.findByRole("table", { name: "Spell results" }));
    expect(table.getByText("Augury")).toBeInTheDocument();
    expect(table.getByText("Divination", { selector: "td button" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2 spells found");
    expect(list).toHaveBeenCalledTimes(1);
    expect(list.mock.calls[0][0]).toMatchObject({ criteria: { name: "", school: "divination" }, page: 0, pageSize: 25, sort: "name,asc" });
  });

  it("takes the name typed, and Enter in the box searches too", async () => {
    const list = stubList();
    renderSearch(list);

    fireEvent.change(screen.getByLabelText("Name contains"), { target: { value: "  aug " } });
    fireEvent.submit(screen.getByRole("form", { name: "Search spells" }));

    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    expect(list.mock.calls[0][0].criteria).toEqual({ name: "aug", school: "divination" });
  });

  it("leaves the table as it is while the name is edited, until Search is pressed again", async () => {
    const list = stubList();
    renderSearch(list);
    search();
    await screen.findByRole("table");

    fireEvent.change(screen.getByLabelText("Name contains"), { target: { value: "shield" } });
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(list).toHaveBeenCalledTimes(1);
    search();
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(list.mock.calls[1][0].criteria.name).toBe("shield");
  });

  it("sorts when a header is pressed, back to the first page, and the other way when pressed again", async () => {
    const list = stubList(() => answer([row("a", "Augury")], { totalElements: 80 }));
    renderSearch(list);
    search();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: "Level" }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(list.mock.calls[1][0]).toMatchObject({ sort: "level,asc", page: 0 });

    fireEvent.click(screen.getByRole("button", { name: "Level" }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(3));
    expect(list.mock.calls[2][0].sort).toBe("level,desc");
  });

  it("has no sort on a column the backend can't sort", async () => {
    renderSearch(stubList());
    search();
    await screen.findByRole("table");

    expect(screen.getByRole("columnheader", { name: "School" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "School" })).not.toBeInTheDocument();
  });

  it("goes to the next page for the same search, and a new page size starts again at the first", async () => {
    const list = stubList(() => answer([row("a", "Augury")], { totalElements: 80 }));
    renderSearch(list);
    fireEvent.change(screen.getByLabelText("Name contains"), { target: { value: "a" } });
    search();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /next page/i }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    expect(list.mock.calls[1][0]).toMatchObject({ page: 1, criteria: { name: "a", school: "divination" } });

    fireEvent.mouseDown(screen.getByRole("combobox", { name: /rows per page/i }));
    fireEvent.click(await screen.findByRole("option", { name: "50" }));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(3));
    expect(list.mock.calls[2][0]).toMatchObject({ page: 0, pageSize: 50 });
  });

  it("opens the row chosen", async () => {
    const onOpen = vi.fn();
    renderSearch(stubList(() => answer([row("a", "Augury")])), { onOpen });
    search();

    fireEvent.click(await screen.findByRole("button", { name: "Open Augury" }));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ key: "a" }));
  });

  it("says when nothing matches", async () => {
    renderSearch(stubList(() => answer([])));
    search();

    expect(await screen.findByRole("status")).toHaveTextContent("No spells match");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("says when it couldn't search, and keeps the results already shown", async () => {
    let fail = false;
    const list = stubList(() => {
      if (fail) {
        throw new Error("Backend down");
      }
      return answer([row("a", "Augury")]);
    });
    renderSearch(list);
    search();
    await screen.findByRole("table");

    fail = true;
    search();

    expect(await screen.findByText(/Couldn't load the spells: Backend down/)).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Spell results" })).toBeInTheDocument();
  });

  it("uses the newest search when two are in flight", async () => {
    const resolvers = [];
    const list = vi.fn(({ signal }) => new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
      resolvers.push(resolve);
    }));
    renderSearch(list);
    fireEvent.change(screen.getByLabelText("Name contains"), { target: { value: "old" } });
    search();
    fireEvent.change(screen.getByLabelText("Name contains"), { target: { value: "new" } });
    search();
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));

    resolvers[1](answer([row("n", "Newer")]));

    expect(await screen.findByText("Newer")).toBeInTheDocument();
    expect(screen.queryByText(/Couldn't load/)).not.toBeInTheDocument();
  });
});
