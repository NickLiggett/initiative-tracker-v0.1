import { useEffect, useState } from "react";
import { Autocomplete, CircularProgress, TextField, Typography } from "@mui/material";
import { capitalizeFirstLetter } from "../../utils/text";

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DELAY_MS = 300;

/**
 * Picks one of a kind of content (creatures, items, ...) by searching the backend as you type. The same name often
 * exists in several sources (e.g. the 2014 and 2024 rules), so each option shows its source too.
 *
 * @param {(text: string, options: {signal: AbortSignal}) => Promise<object[]>} search finds the matches
 * @param {string} noun e.g. "creature"; names the field and fills the messages
 * @param {string} [plural] e.g. "creatures"; "<noun>s" if left out
 * @param {(resource: object) => string} [secondary] the small text under an option's name; its source by default
 * @param {(a: object, b: object) => boolean} [isSame] whether two results are the same one; same `key` by default
 */
export default function ResourceSearch({
  search,
  noun,
  plural = `${noun}s`,
  label = capitalizeFirstLetter(noun),
  secondary = (resource) => resource.document?.displayName,
  isSame = (a, b) => a.key === b.key,
  value,
  onChange,
  fullWidth = false,
}) {
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
        setOptions(await search(text, { signal: controller.signal }));
      } catch (e) {
        if (e.name !== "AbortError") {
          setError(`Couldn't load ${plural}. Is the backend running?`);
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
    // `search` is left out on purpose: it is the same function for the life of the page.
  }, [input, value]);

  return (
    <Autocomplete
      value={value || null}
      onChange={(event, resource) => onChange(resource)}
      inputValue={input}
      onInputChange={(event, text) => setInput(text)}
      options={options}
      filterOptions={(all) => all} // the backend already filtered
      getOptionLabel={(resource) => resource?.name ?? ""}
      isOptionEqualToValue={isSame}
      noOptionsText={input.trim().length < MIN_SEARCH_LENGTH ? "Type to search" : `No ${plural} found`}
      loading={loading}
      autoHighlight
      disablePortal
      size="small"
      sx={fullWidth ? { width: "100%", my: 1 } : { width: 240, m: 1 }}
      renderOption={(props, resource) => (
        <li {...props} key={resource.key}>
          <div>
            <Typography>{resource.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {secondary(resource)}
            </Typography>
          </div>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
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
