import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { classesApi } from "../../api/classes";
import { itemsApi, magicItemsApi } from "../../api/items";
import { getInventory, updateDerived } from "../../api/players";
import { armorClassOf, classWeaponTraining, initiativeOf } from "./sheetDerived";

/** The classes of a character as names, for the class features that change armor class. */
const classNamesOf = (player) =>
  player.classes?.length ? player.classes.map((one) => one.className) : [player.className].filter(Boolean);

/**
 * The armor class and initiative a character has, worked out from their abilities, what they have equipped and the sheet's
 * adjustments, and saved to the character (without counting as a save of the sheet) when they differ from what is kept,
 * so that the initiative tracker and the party see the same numbers. A DM seeing a party member's sheet sees the numbers
 * but doesn't save them.
 *
 * Armor class waits for the inventory to be read; until then, and if it can't be read, the kept number stands.
 *
 * @param {?object} player the character, null while loading
 * @param {Function} setPlayer replaces the character shown, given the new one or a function of the old
 * @returns {{derived: object, weapons: object[], weaponTraining: string[], inventoryChanged: () => void}} `derived` has `initiativeBonus`, and `armorClass` once
 *   known; `weapons` are the weapon items equipped (for their attacks) and `weaponTraining` what the class says about weapon
 *   training (for whether it is trained in them); `inventoryChanged` is to be called when the inventory is
 *   saved, to work armor class out again
 */
export default function useDerivedStats(player, setPlayer) {
  const [carried, setCarried] = useState(null); // [{equipped, item}] for each equipped line of the inventory that is an item, null until read
  const [reads, setReads] = useState(0);
  const [weaponTraining, setWeaponTraining] = useState([]); // what the first class says about weapon training
  const cache = useRef(new Map());
  const sent = useRef({}); // the value of each number last sent
  const id = player?.id;

  useEffect(() => {
    if (id == null) {
      return undefined;
    }
    const controller = new AbortController();
    const lookup = async (line) => {
      const api = line.kind === "MAGIC" ? magicItemsApi : itemsApi;
      const cacheKey = `${line.kind}:${line.itemKey}`;
      if (!cache.current.has(cacheKey)) {
        cache.current.set(cacheKey, api.get(line.itemKey, { signal: controller.signal }).catch(() => null));
      }
      return cache.current.get(cacheKey);
    };
    getInventory(id, { signal: controller.signal })
      .then((inventory) =>
        Promise.all((inventory.items ?? []).filter((line) => line.equipped && line.itemKey).map((line) => lookup(line).then((item) => ({ equipped: Boolean(line.equipped), item })))),
      )
      .then((lines) => !controller.signal.aborted && setCarried(lines.filter(({ item }) => item)))
      .catch(() => {}); // the kept armor class stands
    return () => controller.abort();
  }, [id, reads]);

  const firstClassKey = player?.classes?.[0]?.classKey ?? player?.classKey;
  useEffect(() => {
    setWeaponTraining([]);
    if (!firstClassKey) {
      return undefined;
    }
    const controller = new AbortController();
    classesApi
      .get(firstClassKey, { signal: controller.signal })
      .then((cls) => setWeaponTraining([classWeaponTraining(cls)].filter(Boolean)))
      .catch(() => {}); // the sheet's own list of training stands
    return () => controller.abort();
  }, [firstClassKey]);

  const sheet = player?.sheet;
  const equippedArmor = useMemo(() => (carried ?? []).filter(({ equipped, item }) => equipped && item.armor).map(({ item }) => item), [carried]);
  const weapons = useMemo(() => (carried ?? []).filter(({ item }) => item.weapon).map(({ item }) => item), [carried]);
  const classKey = classNamesOf(player ?? {}).join("|");
  const derived = useMemo(() => {
    if (!player) {
      return {};
    }
    const numbers = { initiativeBonus: initiativeOf(sheet ?? {}) };
    if (carried) {
      numbers.armorClass = armorClassOf(sheet ?? {}, classKey ? classKey.split("|") : [], equippedArmor);
    }
    return numbers;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the character's sheet and classes are what the numbers come from
  }, [Boolean(player), sheet, classKey, equippedArmor, carried]);

  const storedArmorClass = player?.armorClass;
  const storedInitiative = player?.initiativeBonus;
  const role = player?.role;
  useEffect(() => {
    if (id == null || role === "PARTY") {
      return;
    }
    // Each number is sent once for each value it takes, however the answers arrive, so two that cross can't send each other back and forth.
    const changes = {};
    if (derived.armorClass !== undefined && derived.armorClass !== storedArmorClass && derived.armorClass !== sent.current.armorClass) {
      changes.armorClass = derived.armorClass;
    }
    if (derived.initiativeBonus !== undefined && derived.initiativeBonus !== storedInitiative && derived.initiativeBonus !== sent.current.initiativeBonus) {
      changes.initiativeBonus = derived.initiativeBonus;
    }
    if (Object.keys(changes).length === 0) {
      return;
    }
    Object.assign(sent.current, changes);
    updateDerived(id, changes)
      .then((saved) => setPlayer((current) => (current ? { ...current, armorClass: saved.armorClass, initiativeBonus: saved.initiativeBonus } : current)))
      .catch(() => {
        for (const field of Object.keys(changes)) {
          delete sent.current[field]; // try again at the next change
        }
      });
  }, [id, role, derived, storedArmorClass, storedInitiative, setPlayer]);

  const inventoryChanged = useCallback(() => setReads((count) => count + 1), []);
  return { derived, weapons, weaponTraining, inventoryChanged };
}
