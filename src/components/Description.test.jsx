import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Description, { toBlocks } from "./Description";

describe("Description", () => {
  it("splits paragraphs and bullet lists", () => {
    expect(toBlocks("Intro\n- one\n- two\n\nOutro")).toEqual([
      { text: "Intro" },
      { list: ["one", "two"] },
      { text: "Outro" },
    ]);
  });

  it("renders bold, italic and list items", () => {
    render(<Description text={"The dragon casts:\n- **3/Day Each:** Fog Cloud, *Legend Lore*"} />);

    expect(screen.getByText("3/Day Each:").tagName).toBe("STRONG");
    expect(screen.getByText("Legend Lore").tagName).toBe("EM");
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("copes with no text", () => {
    const { container } = render(<Description text={null} />);
    expect(container.textContent).toBe("");
  });
});

describe("tables", () => {
  const table = "| 1d100 | Creature Type |\n|-------|---------------|\n| 01–10 | Aberrations   |\n| 11–15 | **Beasts** |";

  it("make the first line the head when dashes follow it", () => {
    expect(toBlocks(`Roll on the table:\n\n${table}\n\nThen continue.`)).toEqual([
      { text: "Roll on the table:" },
      {
        table: {
          head: ["1d100", "Creature Type"],
          rows: [
            ["01–10", "Aberrations"],
            ["11–15", "**Beasts**"],
          ],
        },
      },
      { text: "Then continue." },
    ]);
  });

  it("start straight after a line of text, and need no head", () => {
    expect(toBlocks("Consult this table.\n| 1 | Boar |\n| 2 | Panther |")).toEqual([
      { text: "Consult this table." },
      {
        table: {
          head: null,
          rows: [
            ["1", "Boar"],
            ["2", "Panther"],
          ],
        },
      },
    ]);
  });

  it("allow a missing final bar, and fill short rows out to the widest", () => {
    const { table: parsed } = toBlocks("| Roll | Result\n|---|---|\n| 4 | Boar |\n| 6 | Giant badger | Only a beast can change |")[0];

    expect(parsed.head).toEqual(["Roll", "Result", ""]);
    expect(parsed.rows).toEqual([
      ["4", "Boar", ""],
      ["6", "Giant badger", "Only a beast can change"],
    ]);
  });

  it("show as a table, with the head as column headers and inline formatting in the cells", () => {
    render(<Description text={table} />);

    expect(screen.getByRole("columnheader", { name: "Creature Type" })).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("Beasts").tagName).toBe("STRONG");
    expect(screen.getByRole("cell", { name: "01–10" })).toBeInTheDocument();
  });
});
