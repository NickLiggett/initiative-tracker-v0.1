// Filling in the add-combatant form from the creature chosen, without overwriting what the user typed.

import { rollInitiative } from "./playerCombatants";

/** The form fields a creature fills in, and what each is limited to (see CombatantForm). */
const MAX_NAME_LENGTH = 25;
const MAX_NUMBER = { initiative: 99, armorClass: 99, hitPoints: 9999 };
export const PREFILLED = ["name", "initiative", "armorClass", "hitPoints"];

const asNumberText = (value, max) => (Number.isFinite(value) ? String(Math.min(Math.max(Math.trunc(value), 0), max)) : "");

/** What the creature gives each field: its name, a d20 plus its initiative bonus, its armor class and hit points. */
export function creatureFields(creature, random = Math.random) {
  return {
    name: String(creature.name ?? "").slice(0, MAX_NAME_LENGTH),
    initiative: asNumberText(rollInitiative(creature.initiativeBonus ?? 0, random), MAX_NUMBER.initiative),
    armorClass: asNumberText(creature.armorClass, MAX_NUMBER.armorClass),
    hitPoints: asNumberText(creature.hitPoints, MAX_NUMBER.hitPoints),
  };
}

/**
 * The form after a change. `form.filled` lists the fields that were filled in from a creature rather than typed.
 * Typing in a field takes it out of that list for good; picking a creature fills the fields that are empty or were
 * only filled in, and leaves what the user typed; clearing the creature empties what it filled in.
 */
export function applyChange(form, changes, random = Math.random) {
  const next = { ...form, ...changes };
  const filled = new Set(form.filled ?? []);

  for (const field of PREFILLED) {
    if (field in changes) {
      filled.delete(field); // typed
    }
  }

  if ("creature" in changes && changes.creature !== form.creature) {
    if (changes.creature) {
      const fields = creatureFields(changes.creature, random);
      for (const field of PREFILLED) {
        if (next[field] === "" || filled.has(field)) {
          next[field] = fields[field];
          if (fields[field] !== "") {
            filled.add(field);
          }
        }
      }
    } else {
      for (const field of filled) {
        next[field] = "";
      }
      filled.clear();
    }
  }

  return { ...next, filled: [...filled] };
}
