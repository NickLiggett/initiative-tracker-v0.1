import { vi } from "vitest";

/**
 * Stands in for the backend: `routes` maps "METHOD /path" (the path without its query) to the JSON to answer with,
 * or to a function of the request body. Anything else is a 404.
 */
export function stubApi(routes) {
  const fetchMock = vi.fn(async (url, init = {}) => {
    const route = `${init.method ?? "GET"} ${url.split("?")[0]}`;
    if (!(route in routes)) {
      return new Response(JSON.stringify({ detail: `No route for ${route}` }), { status: 404 });
    }
    const answer = routes[route];
    const body = init.body ? JSON.parse(init.body) : undefined;
    return new Response(JSON.stringify(typeof answer === "function" ? answer(body) : answer), {
      status: route.startsWith("POST") ? 201 : 200,
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** The bodies sent to a route, in order. */
export function bodiesSentTo(fetchMock, route) {
  return fetchMock.mock.calls
    .filter(([url, init = {}]) => `${init.method ?? "GET"} ${url.split("?")[0]}` === route)
    .map(([, init]) => JSON.parse(init.body));
}

export const SIZES = {
  content: [
    { key: "medium", name: "Medium", suggestedHitDice: "d8" },
    { key: "huge", name: "Huge", suggestedHitDice: "d12" },
  ],
};

export const TYPES = { content: [{ key: "dragon", name: "Dragon" }, { key: "beast", name: "Beast" }] };

export const DAMAGE_TYPES = {
  content: [
    { key: "acid", name: "Acid" },
    { key: "fire", name: "Fire" },
    { key: "cold", name: "Cold" },
  ],
};

export const CONDITIONS = { content: [{ key: "charmed", name: "Charmed" }, { key: "frightened", name: "Frightened" }] };

/** The routes for the lists the creature editor offers. */
export const REFERENCE_ROUTES = {
  "GET /api/sizes": SIZES,
  "GET /api/creaturetypes": TYPES,
  "GET /api/damagetypes": DAMAGE_TYPES,
  "GET /api/conditions": CONDITIONS,
};

/** The routes that say whose documents are whose: the user is 1, and owns `u1-homebrew`. */
export const OWNERSHIP_ROUTES = {
  "GET /api/me": { id: 1, username: "dev" },
  "GET /api/documents": {
    content: [
      { key: "u1-homebrew", ownerId: 1 },
      { key: "u2-homebrew", ownerId: 2 },
      { key: "srd-2014", ownerId: null },
    ],
  },
};

export const ITEM_CATEGORIES = {
  content: [
    { key: "adventuring-gear", name: "Adventuring Gear" },
    { key: "armor", name: "Armor" },
    { key: "weapon", name: "Weapon" },
  ],
};

export const ITEM_RARITIES = {
  content: [
    { key: "uncommon", name: "Uncommon", rank: 2 },
    { key: "rare", name: "Rare", rank: 3 },
  ],
};

export const WEAPON_PROPERTIES = {
  content: [
    { key: "srd-2024_versatile-wp", name: "Versatile", type: null, desc: "One or two hands.", document: { displayName: "5e 2024 Rules" } },
    { key: "srd-2024_sap-mastery", name: "Sap", type: "Mastery", desc: "Disadvantage on the next attack.", document: { displayName: "5e 2024 Rules" } },
  ],
};

/** The routes for the lists the item editor offers. */
export const ITEM_REFERENCE_ROUTES = {
  "GET /api/itemcategories": ITEM_CATEGORIES,
  "GET /api/itemrarities": ITEM_RARITIES,
  "GET /api/damagetypes": DAMAGE_TYPES,
  "GET /api/weaponproperties": WEAPON_PROPERTIES,
};
