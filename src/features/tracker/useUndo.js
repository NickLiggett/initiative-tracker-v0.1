import { useCallback, useEffect, useRef, useState } from "react";

/** How many changes can be undone. */
export const UNDO_LIMIT = 50;

/** True if Ctrl+Z (or Ctrl+Y) pressed here is the tracker's to handle, not a text field's or an open dialog's. */
function trackerOwnsUndo(event) {
  const target = event.target;
  if (target instanceof Element && target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) {
    return false;
  }
  return !document.querySelector('[role="dialog"]');
}

/**
 * Undo and redo for the initiative order. `setCombatants` is the state's own setter; `change` does the same and
 * remembers what was there before, so each change can be taken back, and brought forward again. A new change after an
 * undo drops what could have been redone. `resetKey` changing (another tracker was loaded) forgets all of it.
 *
 * Ctrl+Z undoes and Ctrl+Y or Ctrl+Shift+Z redoes, unless the user is typing in a field or a dialog is open.
 *
 * @returns {{change: Function, undo: Function, redo: Function, canUndo: boolean, canRedo: boolean}}
 */
export default function useUndo(combatants, setCombatants, resetKey) {
  const [stacks, setStacks] = useState({ past: [], future: [] });
  const current = useRef(combatants);
  current.current = combatants;
  const kept = useRef(stacks);
  kept.current = stacks;

  const put = (next) => {
    kept.current = next;
    setStacks(next);
  };

  useEffect(() => {
    put({ past: [], future: [] });
  }, [resetKey]);

  const change = useCallback(
    (update) => {
      const next = typeof update === "function" ? update(current.current) : update;
      if (next === current.current) {
        return;
      }
      put({ past: [...kept.current.past, current.current].slice(-UNDO_LIMIT), future: [] });
      current.current = next;
      setCombatants(next);
    },
    [setCombatants],
  );

  const undo = useCallback(() => {
    const { past, future } = kept.current;
    if (past.length === 0) {
      return;
    }
    put({ past: past.slice(0, -1), future: [current.current, ...future] });
    current.current = past.at(-1);
    setCombatants(past.at(-1));
  }, [setCombatants]);

  const redo = useCallback(() => {
    const { past, future } = kept.current;
    if (future.length === 0) {
      return;
    }
    put({ past: [...past, current.current], future: future.slice(1) });
    current.current = future[0];
    setCombatants(future[0]);
  }, [setCombatants]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || !trackerOwnsUndo(event)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  return { change, undo, redo, canUndo: stacks.past.length > 0, canRedo: stacks.future.length > 0 };
}
