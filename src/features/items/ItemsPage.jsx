import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { apiFor, listItems, searchItems } from "../../api/items";
import { listItemCategories, listItemRarities } from "../../api/reference";
import ResourcePage from "../../components/resource/ResourcePage";
import ResourceSearch from "../../components/resource/ResourceSearch";
import ResultsSearch from "../../components/resource/ResultsSearch";
import ItemComparison from "./ItemComparison";
import ItemEditor from "./ItemEditor";
import ItemFilters, { NO_FILTERS } from "./ItemFilters";
import ItemStatBlock from "./ItemStatBlock";
import { attunementText, formatCost, formatWeight, isMagicItem } from "./itemFormat";

/**
 * Search for an item or magic item and read it, compare it with another, or make, change and delete your own. Or list
 * the magic items, or the ordinary ones, that match a name, category and rarity as a table, a page at a time.
 */
export default function ItemsPage() {
  const [filters, setFilters] = useState(NO_FILTERS);
  const [lists, setLists] = useState({ categories: [], rarities: [] });
  // The two kinds are two collections of the backend, and a page can't be told off two at once: the table lists one.
  const [tableKind, setTableKind] = useState("magic");

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
  const narrowed = useMemo(
    () => ({
      kind: tableKind,
      category: filters.category || undefined,
      rarity: tableKind === "magic" ? filters.rarity || undefined : undefined, // ordinary items have none
    }),
    [tableKind, filters.category, filters.rarity],
  );
  const list = useCallback(({ criteria, ...paging }) => listItems({ ...criteria, ...paging }), []);

  return (
    <ResourcePage
      noun="item"
      description="Items are weapons, armor, gear and magic items, with costs, weights and rarity. Look them up here, or make your own homebrew items to hand out to your players."
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
      renderResults={({ onOpen }) => (
        <ResultsSearch
          noun="item"
          plural="items"
          list={list}
          filterCriteria={narrowed}
          columns={COLUMNS}
          onOpen={onOpen}
          extra={<TableKind value={tableKind} onChange={setTableKind} />}
        />
      )}
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

/** Which collection the table lists. */
function TableKind({ value, onChange }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography variant="body2" color="text.secondary">
        List
      </Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        aria-label="List"
        value={value}
        onChange={(event, kind) => kind !== null && onChange(kind)}
      >
        <ToggleButton value="magic" sx={{ textTransform: "none" }}>
          Magic items
        </ToggleButton>
        <ToggleButton value="item" sx={{ textTransform: "none" }}>
          Ordinary items
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}

/** What the table of items shows. Only what the backend can sort by, as it is stored, has a `sortField`. */
const COLUMNS = [
  { key: "name", label: "Name", sortField: "name", render: (item) => item.name },
  { key: "category", label: "Category", render: (item) => item.category?.name ?? "" },
  { key: "rarity", label: "Rarity", render: (item) => item.rarity?.name ?? "" },
  { key: "attunement", label: "Attunement", render: (item) => (attunementText(item) ? "Required" : "") },
  { key: "cost", label: "Cost", sortField: "cost", align: "right", render: (item) => formatCost(item.cost) },
  { key: "weight", label: "Weight", sortField: "weight", align: "right", render: (item) => formatWeight(item.weight, item.weightUnit) },
  { key: "source", label: "Source", render: (item) => item.document?.displayName ?? item.document?.name ?? "" },
];
