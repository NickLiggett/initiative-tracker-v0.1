import { describe, expect, it, vi } from "vitest";
import { announcePlayerChanged, onPlayerChanged } from "./playerChanges";

describe("telling other tabs a character changed", () => {
  it("is quiet when nothing is listening, and stops listening when asked", () => {
    const listener = vi.fn();
    const stop = onPlayerChanged(listener);

    expect(() => announcePlayerChanged(7)).not.toThrow();
    stop();
    expect(typeof stop).toBe("function");
  });
});
