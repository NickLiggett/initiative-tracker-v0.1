import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";

/**
 * Two things side by side as a table of rows (see `compareRows`: sections of `{label, values, delta, higher, deltaText,
 * differs}`). The bigger number is bold with how much bigger it is; rows that differ have a background.
 * @param {object[]} resources the two things compared, for the column headings (`name`, `document`)
 */
export default function ComparisonTable({ resources, sections }) {
  return (
    <TableContainer sx={{ maxHeight: "70vh" }}>
      <Table size="small" stickyHeader aria-label="Comparison">
        <TableHead>
          <TableRow>
            <TableCell />
            {resources.map((resource, index) => (
              <TableCell key={`${index}:${resource.key}`} sx={{ width: "40%" }}>
                <Typography sx={{ fontWeight: "bolder" }}>{resource.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {resource.document?.displayName}
                </Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        {sections.map((section) => (
          <TableBody key={section.title}>
            <TableRow>
              <TableCell colSpan={3} sx={{ fontWeight: "bolder", bgcolor: "action.selected" }}>
                {section.title}
              </TableCell>
            </TableRow>
            {section.rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell component="th" scope="row">
                  {row.label}
                </TableCell>
                {row.values.map((value, index) => (
                  <TableCell
                    key={index}
                    sx={{
                      fontWeight: row.higher === index ? "bold" : "normal",
                      bgcolor: row.differs ? "action.hover" : undefined,
                    }}
                  >
                    {value}
                    {row.higher === index && row.deltaText && (
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {row.deltaText}
                      </Typography>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        ))}
      </Table>
    </TableContainer>
  );
}
