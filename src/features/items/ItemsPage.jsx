import { useCallback, useEffect, useState } from "react";
import { apiFor, searchItems } from "../../api/items";
import { listItemCategories, listItemRarities } from "../../api/reference";
import ResourcePage from "../../components/resource/ResourcePage";
import ResourceSearch from "../../components/resource/ResourceSearch";
import ItemComparison from "./ItemComparison";
import ItemEditor from "./ItemEditor";
import ItemFilters, { NO_FILTERS } from "./ItemFilters";
import ItemStatBlock from "./ItemStatBlock";
import { isMagicItem } from "./itemFormat";

/** Search for an item or magic item and read it, compare it with another, or make, change and delete your own. */
export default function ItemsPage() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [lists, setLists] = useState({ categories: [], rarities: [] });

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    // Without the lists the filters just have nothing to offer; searching still works.
    Promise.all([listItemCategories({ signal }), listItemRarities({ signal })])
      .then(([categories, rarities]) => setLists({ categories, rarities }))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const search = useCallback((text, { signal }) => searchItems(text, { ...filters, signal }), [filters]);

  return (
    <ResourcePage
      noun="item"
      emptyText="Search for an item to see its details."
      renderSearch={(props) => (
        <ResourceSearch
          noun="item"
          plural="items"
          search={search}
          secondary={describeResult}
          isSame={sameItem}
          optionKey={itemKey}
          {...props}
        />
      )}
      filters={<ItemFilters filters={filters} onChange={setFilters} {...lists} />}
      renderStatBlock={(item) => <ItemStatBlock item={item} />}
      renderComparison={(items) => <ItemComparison items={items} />}
      renderEditor={({ resource, onSaved, onCancel }) => <ItemEditor item={resource} onSaved={onSaved} onCancel={onCancel} />}
      copy={(item) => apiFor(item).copy(item.key)}
      remove={(item) => apiFor(item).remove(item.key)}
    />
  );
}

/** "Wondrous Item · Uncommon · 5e 2024 Rules" */
function describeResult(item) {
  return [item.category?.name, isMagicItem(item) && item.rarity?.name, item.document?.displayName]
    .filter(Boolean)
    .join(" · ");
}

// An item and a magic item may have the same key, so the kind is part of what identifies a result.
const itemKey = (item) => `${isMagicItem(item) ? "magic" : "item"}:${item.key}`;
const sameItem = (a, b) => itemKey(a) === itemKey(b);
