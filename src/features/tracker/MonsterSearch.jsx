import { useEffect, useState } from "react";
import { Autocomplete, CircularProgress, TextField, Typography } from "@mui/material";
import { searchCreatures } from "../../api/creatures";

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DELAY_MS = 300;

/**
 * Picks a creature by searching the backend as you type. The same name often exists in several sources
 * (e.g. the 2014 and 2024 rules), so each option shows its source too.
 */
export default function MonsterSearch({ value, onChange }) {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const text = input.trim();
    if (text.length < MIN_SEARCH_LENGTH || text === value?.name) {
      setOptions(value ? [value] : []);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        setOptions(await searchCreatures(text, { signal: controller.signal }));
      } catch (e) {
        if (e.name !== "AbortError") {
          setError("Couldn't load monsters. Is the backend running?");
          setOptions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [input, value]);

  return (
    <Autocomplete
      value={value || null}
      onChange={(event, creature) => onChange(creature)}
      inputValue={input}
      onInputChange={(event, text) => setInput(text)}
      options={options}
      filterOptions={(all) => all} // the backend already filtered
      getOptionLabel={(creature) => creature?.name ?? ""}
      isOptionEqualToValue={(option, selected) => option.key === selected.key}
      noOptionsText={input.trim().length < MIN_SEARCH_LENGTH ? "Type to search" : "No monsters found"}
      loading={loading}
      autoHighlight
      disablePortal
      size="small"
      sx={{ width: 240, m: 1 }}
      renderOption={(props, creature) => (
        <li {...props} key={creature.key}>
          <div>
            <Typography>{creature.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {creature.document?.displayName}
            </Typography>
          </div>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Monster"
          error={Boolean(error)}
          helperText={error}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading && <CircularProgress color="inherit" size={16} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
