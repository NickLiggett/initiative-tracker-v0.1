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
