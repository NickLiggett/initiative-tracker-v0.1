import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import chainMail from "../../test/fixtures/item-chain-mail.json";
import longsword from "../../test/fixtures/item-longsword.json";
import rope from "../../test/fixtures/item-rope.json";
import amulet from "../../test/fixtures/magic-item-amulet-of-the-planes.json";
import bagOfHolding from "../../test/fixtures/magic-item-bag-of-holding.json";
import anchor from "../../test/fixtures/magic-item-weapon.json";
import ItemStatBlock from "./ItemStatBlock";

describe("ItemStatBlock", () => {
  it("shows an ordinary item's name, kind, source, cost, weight and description", () => {
    render(<ItemStatBlock item={rope} />);

    expect(screen.getByRole("heading", { name: "Rope" })).toBeInTheDocument();
    expect(screen.getByText("Item · Adventuring Gear")).toBeInTheDocument();
    expect(screen.getByText("5e 2024 Rules")).toBeInTheDocument();
    expect(screen.getByText("1 gp")).toBeInTheDocument();
    expect(screen.getByText("5 lb")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Description" })).toBeInTheDocument();
    expect(screen.getByText(/tie a knot with Rope/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Weapon/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^Armor/ })).not.toBeInTheDocument();
  });

  it("shows a weapon's damage, class, properties and mastery", () => {
    render(<ItemStatBlock item={longsword} />);

    expect(screen.getByRole("heading", { name: "Weapon" })).toBeInTheDocument();
    expect(screen.getByText("1d8 slashing")).toBeInTheDocument();
    expect(screen.getByText("Martial")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Properties" })).getByText("Versatile (1d10)")).toBeInTheDocument();
    expect(within(screen.getByRole("group", { name: "Mastery" })).getByText("Sap")).toBeInTheDocument();
  });

  it("shows armor's class, type, strength and stealth", () => {
    render(<ItemStatBlock item={chainMail} />);

    expect(screen.getByRole("heading", { name: "Armor" })).toBeInTheDocument();
    expect(screen.getByText("Armor Class").nextSibling).toHaveTextContent("16");
    expect(screen.getByText("Heavy")).toBeInTheDocument();
    expect(screen.getByText("Strength required").nextSibling).toHaveTextContent("13");
    expect(screen.getByText("Disadvantage")).toBeInTheDocument();
  });

  it("shows a magic item's kind and rarity", () => {
    render(<ItemStatBlock item={bagOfHolding} />);

    expect(screen.getByText("Magic item · Wondrous Item · Uncommon")).toBeInTheDocument();
    expect(screen.queryByText(/attunement/)).not.toBeInTheDocument();
    expect(screen.getByText("Cost").nextSibling).toHaveTextContent("—"); // none given
  });

  it("shows attunement, and the ordinary weapon a magic weapon is built on", () => {
    render(<ItemStatBlock item={anchor} />);

    expect(screen.getByText("Requires attunement")).toBeInTheDocument();
    expect(screen.getByText("Magic item · Weapon · Rare")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Weapon: War Pick" })).toBeInTheDocument();
    expect(screen.getByText("1d8 piercing")).toBeInTheDocument();
  });

  it("shows a table in the description as a table", () => {
    render(<ItemStatBlock item={amulet} />);

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Destination" })).toBeInTheDocument();
    expect(within(table).getAllByRole("row").length).toBeGreaterThan(2);
  });
});
