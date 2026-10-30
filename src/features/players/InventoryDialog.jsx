import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { getInventory, saveInventory } from "../../api/players";
import { searchItems } from "../../api/items";
import SourceFilter, { sourceParam } from "../../components/resource/SourceFilter";
import { COINS, inventoryProblems, newLine, summarize, toInventoryDraft, toInventoryRequest } from "./inventory";

/** Finds an item to add by name, from the sources chosen; text that isn't an item can be added as written. */
function ItemAdder({ onAdd }) {
  const [text, setText] = useState("");
  const [sources, setSources] = useState([]);
  const [options, setOptions] = useState([]);
  const document = useMemo(() => sourceParam(sources), [sources]);

  useEffect(() => {
    if (text.trim().length < 2) {
      setOptions([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchItems(text.trim(), { document, pageSize: 15, signal: controller.signal })
        .then(setOptions)
        .catch(() => {}); // the name can still be added as written
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, document]);

  const add = (value) => {
    if (value && (typeof value !== "string" || value.trim())) {
      onAdd(value);
      setText("");
      setOptions([]);
    }
  };

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "flex-start" }}>
      <Autocomplete
        freeSolo
        size="small"
        sx={{ flex: 1, minWidth: 220 }}
        options={options}
        filterOptions={(all) => all}
        getOptionLabel={(option) => (typeof option === "string" ? option : option.name)}
        renderOption={(props, option) => (
          <li {...props} key={option.key}>
            {option.name}
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {"rarity" in option || "requiresAttunement" in option ? "Magic item" : "Item"}
            </Typography>
          </li>
        )}
        inputValue={text}
        onInputChange={(event, value) => setText(value)}
        value={null}
        onChange={(event, value) => add(value)}
        renderInput={(params) => <TextField {...params} label="Add an item" helperText="Find one by name, or type anything and press Enter." />}
      />
      <SourceFilter value={sources} onChange={setSources} />
      <Button variant="outlined" disabled={!text.trim()} onClick={() => add(text)}>
        Add as written
      </Button>
    </Box>
  );
}

/**
 * What a character carries: coins and a list of items, each with a quantity, whether it's equipped or attuned, and a note.
 * Items are found in the Items lists or typed by hand. Whoever can't change it (a DM seeing it through their party) just reads it.
 *
 * @param {{id: number, name: string}} player
 * @param {boolean} [readOnly]
 * @param {() => void} onClose
 */
export default function InventoryDialog({ player, readOnly = false, onClose }) {
  const [draft, setDraft] = useState(null); // null until loaded
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    getInventory(player.id, { signal: controller.signal })
      .then((inventory) => setDraft(toInventoryDraft(inventory)))
      .catch((e) => e.name !== "AbortError" && setLoadError("Couldn't load what this character carries."));
    return () => controller.abort();
  }, [player.id]);

  const problems = draft ? inventoryProblems(draft) : [];
  const change = (changes) => setDraft((current) => ({ ...current, ...changes }));
  const changeLine = (id, changes) =>
    setDraft((current) => ({ ...current, items: current.items.map((line) => (line.id === id ? { ...line, ...changes } : line)) }));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveInventory(player.id, toInventoryRequest(draft));
      onClose();
    } catch (e) {
      setError(e.message || "Couldn't save.");
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby="inventory-title">
      <DialogTitle id="inventory-title">
        {player.name}'s inventory
        {draft && summarize(draft) && (
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            {summarize(draft)}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, alignContent: "start" }}>
        {loadError && <Alert severity="error">{loadError}</Alert>}
        {!draft && !loadError && <CircularProgress aria-label="Loading" />}
        {draft && (
          <>
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(3, minmax(0, 1fr))", pt: 1 }}>
              {COINS.map(({ field, label }) => (
                <TextField
                  key={field}
                  size="small"
                  label={label}
                  value={draft[field]}
                  disabled={readOnly}
                  onChange={(event) => change({ [field]: event.target.value })}
                  inputProps={{ inputMode: "numeric" }}
                />
              ))}
            </Box>

            {!readOnly && <ItemAdder onAdd={(value) => change({ items: [...draft.items, newLine(value)] })} />}

            {draft.items.length === 0 && (
              <Typography color="text.secondary">{readOnly ? "Nothing listed." : "Nothing yet. Add an item above."}</Typography>
            )}
            <Box component="ul" aria-label="Items carried" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gap: 1.5 }}>
              {draft.items.map((line, index) => (
                <Box component="li" key={line.id} role="group" aria-label={`Line ${index + 1}`} sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
                  <TextField
                    size="small"
                    label="Name"
                    value={line.name}
                    disabled={readOnly}
                    onChange={(event) => changeLine(line.id, { name: event.target.value })}
                    inputProps={{ maxLength: 120, "aria-label": `Name of line ${index + 1}` }}
                    sx={{ flex: "2 1 180px" }}
                  />
                  <TextField
                    size="small"
                    label="Qty"
                    value={line.quantity}
                    disabled={readOnly}
                    onChange={(event) => changeLine(line.id, { quantity: event.target.value })}
                    inputProps={{ inputMode: "numeric", "aria-label": `Quantity of line ${index + 1}` }}
                    sx={{ width: 80 }}
                  />
                  <FormControlLabel
                    label="Equipped"
                    control={<Checkbox size="small" checked={line.equipped} disabled={readOnly} onChange={(event) => changeLine(line.id, { equipped: event.target.checked })} inputProps={{ "aria-label": `Equipped, line ${index + 1}` }} />}
                  />
                  <FormControlLabel
                    label="Attuned"
                    control={<Checkbox size="small" checked={line.attuned} disabled={readOnly} onChange={(event) => changeLine(line.id, { attuned: event.target.checked })} inputProps={{ "aria-label": `Attuned, line ${index + 1}` }} />}
                  />
                  <TextField
                    size="small"
                    label="Note"
                    value={line.notes}
                    disabled={readOnly}
                    onChange={(event) => changeLine(line.id, { notes: event.target.value })}
                    inputProps={{ maxLength: 500, "aria-label": `Note on line ${index + 1}` }}
                    sx={{ flex: "2 1 160px" }}
                  />
                  {!readOnly && (
                    <IconButton size="small" aria-label={`Remove line ${index + 1}`} onClick={() => change({ items: draft.items.filter(({ id }) => id !== line.id) })}>
                      <Close fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>

            {!readOnly && problems.length > 0 && (
              <Alert severity="warning" role="status">
                {problems.join(" ")}
              </Alert>
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{readOnly ? "Close" : "Cancel"}</Button>
        {!readOnly && (
          <Button variant="contained" disabled={!draft || saving || problems.length > 0} onClick={save}>
            Save
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
