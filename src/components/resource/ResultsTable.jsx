import { Alert, Box, Link, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TableSortLabel, Typography } from "@mui/material";
import { PAGE_SIZES } from "./useResultsSearch";

/**
 * Search results as a table: one row for each, a header that sorts, and pages. Choosing a row opens that one.
 *
 * @param {{key: string, label: string, render: (resource: object) => ReactNode, sortField?: string, align?: "right"}[]} columns
 *   the first column holds the button that opens the row, so it should be the name; a column with a `sortField` can sort
 * @param {?{content: object[], page: {number: number, totalElements: number}}} result what the backend gave for this page
 * @param {{field: string, direction: "asc"|"desc"}} sort
 * @param {string} noun e.g. "spell"
 * @param {string} [plural]
 */
export default function ResultsTable({
  columns,
  result,
  loading,
  error,
  sort,
  onSortChange,
  page,
  onPageChange,
  pageSize,
  onPageSizeChange,
  onOpen,
  noun,
  plural = `${noun}s`,
}) {
  const total = result?.page?.totalElements ?? result?.content?.length ?? 0;

  const sortBy = (field) => onSortChange({ field, direction: sort.field === field && sort.direction === "asc" ? "desc" : "asc" });

  return (
    <Box sx={{ mt: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          Couldn't load the {plural}: {error}
        </Alert>
      )}
      {result && (
        <>
          <Typography variant="body2" color="text.secondary" role="status" sx={{ mb: 1 }}>
            {loading ? "Searching…" : total === 0 ? `No ${plural} match` : `${total} ${total === 1 ? noun : plural} found`}
          </Typography>
          {total > 0 && (
            <TableContainer sx={{ opacity: loading ? 0.6 : 1 }}>
              <Table size="small" aria-label={`${capitalize(noun)} results`}>
                <TableHead>
                  <TableRow>
                    {columns.map((column) => (
                      <TableCell
                        key={column.key}
                        align={column.align}
                        sortDirection={sort.field === column.sortField ? sort.direction : false}
                      >
                        {column.sortField ? (
                          <TableSortLabel
                            active={sort.field === column.sortField}
                            direction={sort.field === column.sortField ? sort.direction : "asc"}
                            onClick={() => sortBy(column.sortField)}
                          >
                            {column.label}
                          </TableSortLabel>
                        ) : (
                          column.label
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {result.content.map((resource) => (
                    <TableRow key={resource.key} hover sx={{ cursor: "pointer" }} onClick={() => onOpen(resource)}>
                      {columns.map((column, index) => (
                        <TableCell key={column.key} align={column.align}>
                          {index === 0 ? (
                            <Link component="button" type="button" variant="body2" underline="hover" aria-label={`Open ${resource.name}`} sx={{ textAlign: "left" }}>
                              {column.render(resource)}
                            </Link>
                          ) : (
                            column.render(resource)
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {total > 0 && (
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(event, next) => onPageChange(next)}
              rowsPerPage={pageSize}
              rowsPerPageOptions={PAGE_SIZES}
              onRowsPerPageChange={(event) => onPageSizeChange(Number(event.target.value))}
            />
          )}
        </>
      )}
    </Box>
  );
}

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
