import { useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import { Search } from "@mui/icons-material";
import ResultsTable from "./ResultsTable";
import useResultsSearch from "./useResultsSearch";

/**
 * Lists everything that matches, as a table, when Search is pressed (or Enter): a name to look for (optional) and
 * whatever the page's filters ask for. Editing the name or a filter changes nothing until the next Search.
 *
 * @param {(request: {criteria: object, page: number, pageSize: number, sort: string, signal: AbortSignal}) => Promise<{content: object[], page: object}>} list
 *   `criteria` is `{name, ...filterCriteria}` as they were when Search was pressed
 * @param {object} filterCriteria what the page's filters ask for now; the page memoizes it
 * @param {object[]} columns see ResultsTable
 * @param {{field: string, direction: "asc"|"desc"}} [defaultSort]
 * @param {(resource: object) => void} onOpen
 * @param {ReactNode} [extra] more to ask for, next to the name: filters that only the table uses
 */
export default function ResultsSearch({ list, filterCriteria, columns, defaultSort = { field: "name", direction: "asc" }, onOpen, noun, plural, extra }) {
  const [name, setName] = useState("");
  const search = useResultsSearch(list, defaultSort);

  const submit = (event) => {
    event.preventDefault();
    search.run({ name: name.trim(), ...filterCriteria });
  };

  return (
    <Box>
      <Box component="form" noValidate onSubmit={submit} aria-label={`Search ${plural ?? `${noun}s`}`} sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mt: 2 }}>
        <TextField size="small" label="Name contains" value={name} onChange={(event) => setName(event.target.value)} sx={{ minWidth: 260 }} />
        {extra}
        <Button type="submit" variant="contained" startIcon={<Search />}>
          Search
        </Button>
      </Box>
      {!search.hasRun && (
        <Typography color="text.secondary" sx={{ mt: 3, textAlign: "center" }}>
          Press Search to list the {plural ?? `${noun}s`} that match, or choose one above.
        </Typography>
      )}
      <ResultsTable
        columns={columns}
        result={search.result}
        loading={search.loading}
        error={search.error}
        sort={search.sort}
        onSortChange={search.setSort}
        page={search.page}
        onPageChange={search.setPage}
        pageSize={search.pageSize}
        onPageSizeChange={search.setPageSize}
        onOpen={onOpen}
        noun={noun}
        plural={plural}
      />
    </Box>
  );
}
