import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ResourceSearch from "./ResourceSearch";

const rope = { key: "srd_rope", name: "Rope", document: { displayName: "5e 2014 Rules" } };

function type(label, text) {
  const input = screen.getByRole("combobox", { name: label });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: text } });
}

describe("ResourceSearch", () => {
  it("is named for what it finds, and shows each result's name and source", async () => {
    const search = vi.fn().mockResolvedValue([rope]);
    const onChange = vi.fn();
    render(<ResourceSearch noun="item" search={search} value={null} onChange={onChange} />);

    type("Item", "rop");

    fireEvent.click(await screen.findByRole("option", { name: /Rope/ }, { timeout: 2000 }));
    expect(search).toHaveBeenCalledWith("rop", expect.objectContaining({ signal: expect.anything() }));
    expect(onChange).toHaveBeenCalledWith(rope);
  });

  it("can describe results its own way", async () => {
    render(
      <ResourceSearch
        noun="item"
        search={async () => [rope]}
        secondary={(resource) => `A ${resource.name.toLowerCase()}`}
        value={null}
        onChange={() => {}}
      />,
    );

    type("Item", "rop");

    expect(await screen.findByText("A rope", {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("says so, by the plural, when nothing matches or the backend can't be reached", async () => {
    const { rerender } = render(<ResourceSearch noun="item" plural="items" search={async () => []} value={null} onChange={() => {}} />);
    type("Item", "zzz");
    expect(await screen.findByText("No items found", {}, { timeout: 2000 })).toBeInTheDocument();

    rerender(
      <ResourceSearch
        noun="item"
        plural="items"
        search={async () => {
          throw new Error("down");
        }}
        value={null}
        onChange={() => {}}
      />,
    );
    type("Item", "yyy");
    expect(await screen.findByText("Couldn't load items. Is the backend running?", {}, { timeout: 2000 })).toBeInTheDocument();
  });
});
