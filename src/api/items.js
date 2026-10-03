import { createResourceApi } from "./resource";

/** Ordinary items: gear, weapons, armor, tools, ... */
export const itemsApi = createResourceApi("/api/items");

/** Magic items, which are items with a rarity and maybe attunement. */
export const magicItemsApi = createResourceApi("/api/magicitems");

/**
 * Items and magic items whose name contains the text, together, sorted by name.
 * @param {"all"|"item"|"magic"} [kind] which of the two to search
 * @param {string} [category] a category key, e.g. "weapon"
 * @param {string} [rarity] a rarity key, e.g. "rare"; only magic items have one, so this leaves out ordinary items
 * @returns {Promise<object[]>} at most `pageSize`
 */
export async function searchItems(name, { kind = "all", category, rarity, pageSize = 25, signal } = {}) {
  const [ordinary, magic] = await Promise.all([
    kind !== "magic" && !rarity ? itemsApi.search(name, { category, pageSize, signal }) : [],
    kind !== "item" ? magicItemsApi.search(name, { category, rarity, pageSize, signal }) : [],
  ]);
  return [...ordinary, ...magic]
    .sort((a, b) => a.name.localeCompare(b.name) || a.key.localeCompare(b.key))
    .slice(0, pageSize);
}
