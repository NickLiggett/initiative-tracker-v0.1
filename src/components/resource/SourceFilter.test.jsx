import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { stubApi } from "../../test/fakeApi";
import SourceFilter, { sourceParam } from "./SourceFilter";
import { searchFilters as creatureFilters, NO_FILTERS as NO_CREATURE_FILTERS } from "../../features/creatures/CreatureFilters";
import { searchFilters as spellFilters, NO_FILTERS as NO_SPELL_FILTERS } from "../../features/spells/SpellFilters";
import { searchFilters as featFilters, NO_FILTERS as NO_FEAT_FILTERS } from "../../features/feats/FeatFilters";
import { searchFilters as classFilters, NO_FILTERS as NO_CLASS_FILTERS } from "../../features/classes/ClassFilters";
import { sourceCriteria, NO_SOURCE_FILTERS } from "./SourceFilters";

afterEach(() => vi.unstubAllGlobals());

const DOCUMENTS = {
  content: [
    { key: "srd-2014", name: "5e SRD 2014", displayName: "SRD 2014" },
    { key: "kp", name: "Kobold Press Compilation", displayName: "Kobold Press" },
  ],
};

describe("sourceParam", () => {
  it("is the chosen document keys as one list, or nothing for every source", () => {
    expect(sourceParam(["srd-2014", "kp"])).toBe("srd-2014,kp");
    expect(sourceParam([])).toBeUndefined();
    expect(sourceParam(undefined)).toBeUndefined();
  });

  it("is what every kind of page asks the search for", () => {
    const sources = ["kp"];
    expect(creatureFilters({ ...NO_CREATURE_FILTERS, sources }).document).toBe("kp");
    expect(spellFilters({ ...NO_SPELL_FILTERS, sources }, []).document).toBe("kp");
    expect(featFilters({ ...NO_FEAT_FILTERS, sources }).document).toBe("kp");
    expect(classFilters({ ...NO_CLASS_FILTERS, sources }).document).toBe("kp");
    expect(sourceCriteria({ ...NO_SOURCE_FILTERS, sources })).toEqual({ document: "kp" });
    expect(sourceCriteria(NO_SOURCE_FILTERS)).toEqual({ document: undefined });
  });
});

describe("SourceFilter", () => {
  it("offers the sources by their display names and reports the keys chosen", async () => {
    stubApi({ "GET /api/documents": DOCUMENTS });
    const onChange = vi.fn();
    render(<SourceFilter value={[]} onChange={onChange} />);

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Sources" }));
    fireEvent.click(await screen.findByRole("option", { name: "Kobold Press" }));

    expect(onChange).toHaveBeenCalledWith(["kp"]);
  });

  it("shows what is chosen, and can take one away", async () => {
    stubApi({ "GET /api/documents": DOCUMENTS });
    const onChange = vi.fn();
    render(<SourceFilter value={["srd-2014", "kp"]} onChange={onChange} />);

    await waitFor(() => expect(screen.getByText("Kobold Press")).toBeInTheDocument());
    fireEvent.click(screen.getAllByTestId("CancelIcon")[0]);

    expect(onChange).toHaveBeenCalledWith(["kp"]);
  });

  it("still works, with nothing to offer, when the sources can't be loaded", async () => {
    stubApi({});
    render(<SourceFilter value={[]} onChange={() => {}} />);

    fireEvent.mouseDown(screen.getByRole("combobox", { name: "Sources" }));

    expect(await screen.findByText("No sources")).toBeInTheDocument();
  });
});
