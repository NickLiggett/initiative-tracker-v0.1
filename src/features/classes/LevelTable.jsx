import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";

/**
 * A class's level table: a row for each level, with the features gained and each column the class has. Spell slots by
 * spell level are grouped under one heading.
 * @param {{columns: {key: string, label: string, group: ?string}[], rows: object[]}} table as `levelTable` gives it
 */
export default function LevelTable({ table }) {
  const grouped = table.columns.some((column) => column.group);
  // A run of columns in one group is one heading over them; the others are headings that span the two heading rows.
  const headings = [];
  for (const column of table.columns) {
    const last = headings.at(-1);
    if (column.group && last?.group === column.group) {
      last.span += 1;
    } else {
      headings.push({ key: column.key, label: column.group ?? column.label, group: column.group, span: 1 });
    }
  }
  const stick = { fontWeight: "bold", whiteSpace: "nowrap" };

  return (
    <TableContainer sx={{ maxHeight: "60vh" }}>
      <Table size="small" stickyHeader aria-label="Class table">
        <TableHead>
          <TableRow>
            <TableCell rowSpan={grouped ? 2 : 1} sx={stick}>
              Level
            </TableCell>
            <TableCell rowSpan={grouped ? 2 : 1} sx={stick}>
              Features
            </TableCell>
            {headings.map((heading) => (
              <TableCell
                key={heading.key}
                rowSpan={grouped && !heading.group ? 2 : 1}
                colSpan={heading.span}
                align={heading.group ? "center" : "left"}
                sx={stick}
              >
                {heading.label}
              </TableCell>
            ))}
          </TableRow>
          {grouped && (
            <TableRow>
              {table.columns
                .filter((column) => column.group)
                .map((column) => (
                  <TableCell key={column.key} align="center" sx={{ ...stick, top: 37 }}>
                    {column.label}
                  </TableCell>
                ))}
            </TableRow>
          )}
        </TableHead>
        <TableBody>
          {table.rows.map((row) => (
            <TableRow key={row.level} hover>
              <TableCell component="th" scope="row">
                {row.level}
              </TableCell>
              <TableCell>{row.features.length > 0 ? row.features.join(", ") : <Box component="span" sx={{ color: "text.secondary" }}>—</Box>}</TableCell>
              {table.columns.map((column) => (
                <TableCell key={column.key} align={column.group ? "center" : "left"}>
                  {row.values[column.key]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
