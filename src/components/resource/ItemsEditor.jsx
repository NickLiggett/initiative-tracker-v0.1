import { Box, Button, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import { Add, ArrowDownward, ArrowUpward, Delete } from "@mui/icons-material";
import { moveItem } from "../../features/species/speciesDraft";
import { capitalizeFirstLetter } from "../../utils/text";

/**
 * A list of things in a form (a background's benefits, a feat's benefits, ...), each with its own fields, that can be
 * added, removed and put in another order. Each item is a group named "<Noun> 1", "<Noun> 2", ... and its buttons
 * "Move <noun> 1 up", "Remove <noun> 1", ...
 *
 * @param {string} noun e.g. "benefit"
 * @param {object[]} items each needs an `id` of its own, to keep it in its place as others move
 * @param {(items: object[]) => void} onChange gets the whole new list
 * @param {() => object} newItem makes an empty item to add
 * @param {(item: object, change: (changes: object) => void, index: number) => ReactNode} renderFields the item's fields
 * @param {string} [emptyText] what to say while there are no items
 */
export default function ItemsEditor({ noun, items, onChange, newItem, renderFields, emptyText }) {
  const change = (id, changes) => onChange(items.map((item) => (item.id === id ? { ...item, ...changes } : item)));

  return (
    <>
      {items.length === 0 && emptyText && <Typography color="text.secondary">{emptyText}</Typography>}
      {items.map((item, index) => (
        <Paper
          key={item.id}
          variant="outlined"
          role="group"
          aria-label={`${capitalizeFirstLetter(noun)} ${index + 1}`}
          sx={{ p: 1.5, display: "flex", gap: 1, alignItems: "flex-start" }}
        >
          <Box sx={{ flex: 1, display: "grid", gap: 1 }}>{renderFields(item, (changes) => change(item.id, changes), index)}</Box>
          <Tooltip title="Move up">
            <span>
              <IconButton aria-label={`Move ${noun} ${index + 1} up`} disabled={index === 0} onClick={() => onChange(moveItem(items, index, index - 1))}>
                <ArrowUpward />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Move down">
            <span>
              <IconButton
                aria-label={`Move ${noun} ${index + 1} down`}
                disabled={index === items.length - 1}
                onClick={() => onChange(moveItem(items, index, index + 1))}
              >
                <ArrowDownward />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={`Remove ${noun}`}>
            <IconButton aria-label={`Remove ${noun} ${index + 1}`} onClick={() => onChange(items.filter((one) => one.id !== item.id))}>
              <Delete />
            </IconButton>
          </Tooltip>
        </Paper>
      ))}
      <Box>
        <Button startIcon={<Add />} onClick={() => onChange([...items, newItem()])}>
          Add {noun}
        </Button>
      </Box>
    </>
  );
}
