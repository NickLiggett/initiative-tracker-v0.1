import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../../test/fakeApi";
import SubclassField from "./SubclassField";

afterEach(() => vi.unstubAllGlobals());

const SUBCLASSES = { content: [{ key: "srd_champion", name: "Champion" }, { key: "srd_battle-master", name: "Battle Master" }] };

describe("the subclass of a class", () => {
  it("offers the subclasses of the class, and keeps the key of one picked or typed in full", async () => {
    const fetchMock = stubApi({ "GET /api/classes": SUBCLASSES });
    const onChange = vi.fn();
    render(<SubclassField classKey="srd_fighter" label="Subclass" value="" onChange={onChange} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toContain("subclassOf=srd_fighter");
    const input = screen.getByLabelText("Subclass");
    fireEvent.mouseDown(input);
    fireEvent.click(await screen.findByRole("option", { name: "Battle Master" }));
    expect(onChange).toHaveBeenLastCalledWith({ subclassName: "Battle Master", subclassKey: "srd_battle-master" });

    fireEvent.change(input, { target: { value: "champion" } });
    expect(onChange).toHaveBeenLastCalledWith({ subclassName: "champion", subclassKey: "srd_champion" });
    fireEvent.change(input, { target: { value: "My own" } });
    expect(onChange).toHaveBeenLastCalledWith({ subclassName: "My own", subclassKey: null });
  });

  it("still lets the name be typed when the subclasses can't be loaded", async () => {
    stubApi({});
    const onChange = vi.fn();
    render(<SubclassField classKey="srd_fighter" label="Subclass" value="" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Subclass"), { target: { value: "Homebrew" } });
    expect(onChange).toHaveBeenCalledWith({ subclassName: "Homebrew", subclassKey: null });
  });
});
