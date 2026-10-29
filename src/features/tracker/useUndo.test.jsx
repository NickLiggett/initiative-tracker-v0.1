import { describe, expect, it } from "vitest";
import { act, fireEvent, renderHook } from "@testing-library/react";
import { useState } from "react";
import useUndo, { UNDO_LIMIT } from "./useUndo";

function setup(initial = [1]) {
  return renderHook(
    ({ resetKey }) => {
      const [items, setItems] = useState(initial);
      return { items, ...useUndo(items, setItems, resetKey) };
    },
    { initialProps: { resetKey: 0 } },
  );
}

describe("useUndo", () => {
  it("takes a change back, and brings it forward again", () => {
    const { result } = setup();

    act(() => result.current.change((items) => [...items, 2]));
    act(() => result.current.change((items) => [...items, 3]));
    expect(result.current.items).toEqual([1, 2, 3]);

    act(() => result.current.undo());
    expect(result.current.items).toEqual([1, 2]);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.undo());
    act(() => result.current.undo()); // nothing left: nothing happens
    expect(result.current.items).toEqual([1]);
    expect(result.current.canUndo).toBe(false);

    act(() => result.current.redo());
    expect(result.current.items).toEqual([1, 2]);
  });

  it("drops what could be redone when something new is changed", () => {
    const { result } = setup();
    act(() => result.current.change([1, 2]));
    act(() => result.current.undo());

    act(() => result.current.change([1, 9]));

    expect(result.current.canRedo).toBe(false);
  });

  it("counts several changes made at once as separate steps, and a change that changes nothing as none", () => {
    const { result } = setup([]);

    act(() => {
      result.current.change((items) => [...items, "a"]);
      result.current.change((items) => [...items, "b"]);
      result.current.change((items) => items);
    });
    expect(result.current.items).toEqual(["a", "b"]);

    act(() => result.current.undo());
    expect(result.current.items).toEqual(["a"]);
  });

  it("remembers only so many changes", () => {
    const { result } = setup([0]);
    for (let n = 1; n <= UNDO_LIMIT + 5; n++) {
      act(() => result.current.change([n]));
    }
    for (let n = 0; n < UNDO_LIMIT + 5; n++) {
      act(() => result.current.undo());
    }
    expect(result.current.items).toEqual([5]);
  });

  it("forgets everything when another tracker is loaded", () => {
    const { result, rerender } = setup();
    act(() => result.current.change([1, 2]));

    rerender({ resetKey: 1 });

    expect(result.current.canUndo).toBe(false);
  });

  it("answers Ctrl+Z, Ctrl+Y and Ctrl+Shift+Z, but not while typing in a field or with a dialog open", () => {
    const { result } = setup();
    act(() => result.current.change([1, 2]));

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(result.current.items).toEqual([1]);
    fireEvent.keyDown(window, { key: "y", ctrlKey: true });
    expect(result.current.items).toEqual([1, 2]);
    fireEvent.keyDown(window, { key: "Z", ctrlKey: true, shiftKey: true });
    expect(result.current.items).toEqual([1, 2]); // nothing was left to redo

    const input = document.body.appendChild(document.createElement("input"));
    fireEvent.keyDown(input, { key: "z", ctrlKey: true });
    expect(result.current.items).toEqual([1, 2]);
    input.remove();

    const dialog = document.body.appendChild(document.createElement("div"));
    dialog.setAttribute("role", "dialog");
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(result.current.items).toEqual([1, 2]);
    dialog.remove();
  });
});
