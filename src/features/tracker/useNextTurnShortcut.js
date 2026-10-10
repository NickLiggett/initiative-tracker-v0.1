import { useEffect, useRef } from "react";

/** What Space belongs to when focus is on it: typing, pressing a button, a menu, an open dialog, a cell being edited. */
const OWN_SPACE = 'input, textarea, select, button, a, summary, [contenteditable=""], [contenteditable="true"], [role="button"], [role="combobox"], [role="option"], [role="menuitem"], [role="checkbox"], [role="switch"], [role="tab"]';

/** True if Space pressed here should move the turn on rather than do what the focused thing does with it. */
export function spaceMovesTurn(event) {
  if (event.key !== " " || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
    return false;
  }
  const target = event.target;
  if (target instanceof Element && target.closest(OWN_SPACE)) {
    return false;
  }
  return !document.querySelector('[role="dialog"]');
}

/** Pressing Space moves the turn order on, as the Next turn button does. */
export default function useNextTurnShortcut(onNext) {
  const latest = useRef(onNext);
  latest.current = onNext;

  useEffect(() => {
    const onKeyDown = (event) => {
      if (spaceMovesTurn(event)) {
        event.preventDefault(); // not scrolling the page
        latest.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
