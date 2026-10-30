import { useEffect, useMemo, useState } from "react";
import { Autocomplete, Box, Button, TextField, Typography } from "@mui/material";
import { searchSpells } from "../../api/spells";
import SourceFilter, { sourceParam } from "../../components/resource/SourceFilter";
import { levelName } from "../spells/spellFormat";
import { newSpellRow, spellRowFor } from "./sheetCasting";

/**
 * Adds a spell to the sheet: found by name in the spell lists (from the sources chosen), which fills in its level, school,
 * casting time, range and duration, or typed by hand and added as written.
 *
 * @param {(row: object) => void} onAdd given a row of the spell list
 */
export default function SpellAdder({ onAdd }) {
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
      searchSpells(text.trim(), { document, pageSize: 15, signal: controller.signal })
        .then(setOptions)
        .catch(() => {}); // the name can still be added as written
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, document]);

  const add = (value) => {
    if (!value || (typeof value === "string" && !value.trim())) {
      return;
    }
    onAdd(typeof value === "string" ? newSpellRow(value.trim()) : spellRowFor(value));
    setText("");
    setOptions([]);
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
              {levelName(option.level)}
            </Typography>
          </li>
        )}
        inputValue={text}
        onInputChange={(event, value) => setText(value)}
        value={null}
        onChange={(event, value) => add(value)}
        renderInput={(params) => <TextField {...params} label="Add a spell" helperText="Find one by name, or type anything and press Enter." />}
      />
      <SourceFilter value={sources} onChange={setSources} />
      <Button variant="outlined" disabled={!text.trim()} onClick={() => add(text)}>
        Add as written
      </Button>
    </Box>
  );
}
