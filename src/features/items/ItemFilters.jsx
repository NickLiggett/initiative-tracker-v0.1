import { Box, TextField, ToggleButton, ToggleButtonGroup } from "@mui/material";

export const NO_FILTERS = { kind: "all", category: "", rarity: "" };

const KINDS = [
  { value: "all", label: "All" },
  { value: "item", label: "Ordinary" },
  { value: "magic", label: "Magic" },
];

/**
 * Narrows what the item search finds: ordinary or magic items, a category, and a rarity (which only magic items
 * have, so choosing one switches to magic items, and choosing ordinary items drops it).
 * @param {{kind: string, category: string, rarity: string}} filters
 * @param {object[]} categories the item categories to choose from
 * @param {object[]} rarities the rarities to choose from
 */
export default function ItemFilters({ filters, onChange, categories, rarities }) {
  return (
    <Box role="group" aria-label="Filters" sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2, mt: 1 }}>
      <ToggleButtonGroup
        exclusive
        size="small"
        aria-label="Kind"
        value={filters.kind}
        onChange={(event, kind) => {
          if (kind !== null) {
            onChange({ ...filters, kind, rarity: kind === "item" ? "" : filters.rarity });
          }
        }}
      >
        {KINDS.map(({ value, label }) => (
          <ToggleButton key={value} value={value} sx={{ textTransform: "none" }}>
            {label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      <FilterSelect
        label="Category"
        value={filters.category}
        options={categories}
        onChange={(category) => onChange({ ...filters, category })}
      />
      <FilterSelect
        label="Rarity"
        value={filters.rarity}
        options={rarities}
        onChange={(rarity) => onChange({ ...filters, rarity, kind: rarity ? "magic" : filters.kind })}
      />
    </Box>
  );
}

/** A choice of `{key, name}` options, or "Any". */
function FilterSelect({ label, value, options, onChange }) {
  return (
    <TextField
      select
      size="small"
      SelectProps={{ native: true }}
      InputLabelProps={{ shrink: true }} // "Any" is an empty value, which would leave the label over it
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      sx={{ minWidth: 180 }}
    >
      <option value="">Any</option>
      {options.map((option) => (
        <option key={option.key} value={option.key}>
          {option.name}
        </option>
      ))}
    </TextField>
  );
}
