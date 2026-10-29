import { useEffect, useState } from "react";
import { Autocomplete, TextField } from "@mui/material";
import { listDocuments } from "../../api/documents";

/** What to ask the backend for to keep only these sources: the keys of their documents, comma-separated. Nothing chosen is all of them. */
export const sourceParam = (sources) => (sources?.length ? sources.join(",") : undefined);

/**
 * Narrows what is found to the chosen sources (the books and collections the content comes from, and the user's own
 * and shared homebrew). Nothing chosen means every source. If the sources can't be loaded there is nothing to offer,
 * and searching still works.
 * @param {string[]} value the keys of the chosen documents
 * @param {(sources: string[]) => void} onChange
 */
export default function SourceFilter({ value = [], onChange, label = "Sources" }) {
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    listDocuments({ signal: controller.signal })
      .then(setDocuments)
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const nameOf = (document) => document.displayName ?? document.name ?? document.key;
  const chosen = value.map((key) => documents.find((document) => document.key === key) ?? { key, name: key });

  return (
    <Autocomplete
      multiple
      size="small"
      limitTags={2}
      disableCloseOnSelect
      options={documents}
      value={chosen}
      onChange={(event, picked) => onChange(picked.map((document) => document.key))}
      getOptionLabel={nameOf}
      isOptionEqualToValue={(a, b) => a.key === b.key}
      noOptionsText="No sources"
      sx={{ minWidth: 240, maxWidth: 420 }}
      renderInput={(params) => <TextField {...params} label={label} placeholder={value.length ? undefined : "All sources"} />}
    />
  );
}
