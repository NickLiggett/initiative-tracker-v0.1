import { apiGet } from "./client";

/** The creature sizes, smallest first, with the hit die each suggests. @returns {Promise<object[]>} */
export async function listSizes({ signal } = {}) {
  const page = await apiGet("/api/sizes", { pageSize: 50, sort: "rank" }, { signal });
  return page.content;
}

/** The creature types (Dragon, Undead, …), by name. @returns {Promise<object[]>} */
export async function listCreatureTypes({ signal } = {}) {
  const page = await apiGet("/api/creaturetypes", { pageSize: 50, sort: "name" }, { signal });
  return page.content;
}

/** The damage types (Acid, Fire, …), by name. @returns {Promise<object[]>} */
export async function listDamageTypes({ signal } = {}) {
  const page = await apiGet("/api/damagetypes", { pageSize: 100, sort: "name" }, { signal });
  return page.content;
}

/** The conditions a creature can be immune to (Charmed, Frightened, …), by name. @returns {Promise<object[]>} */
export async function listConditions({ signal } = {}) {
  const page = await apiGet("/api/conditions", { pageSize: 100, sort: "name" }, { signal });
  return page.content;
}

/** The item categories (Weapon, Armor, Potion, ...), by name. @returns {Promise<object[]>} */
export async function listItemCategories({ signal } = {}) {
  const page = await apiGet("/api/itemcategories", { pageSize: 100, sort: "name" }, { signal });
  return page.content;
}

/** The magic item rarities, from common to artifact. @returns {Promise<object[]>} */
export async function listItemRarities({ signal } = {}) {
  const page = await apiGet("/api/itemrarities", { pageSize: 100, sort: "rank" }, { signal });
  return page.content;
}
