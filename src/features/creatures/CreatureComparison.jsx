import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { compareCreatures, sharedEntryNames } from "./compareCreatures";
import { CreatureAbilities } from "./CreatureStatBlock";

/** Two creatures side by side: a table of their numbers, then each one's traits and actions. */
export default function CreatureComparison({ creatures }) {
  const [first, second] = creatures;
  const sections = compareCreatures(first, second);
  const sharedNames = sharedEntryNames(first, second);

  return (
    <Box>
      <TableContainer sx={{ maxHeight: "70vh" }}>
        <Table size="small" stickyHeader aria-label="Comparison">
          <TableHead>
            <TableRow>
              <TableCell />
              {creatures.map((creature) => (
                <TableCell key={creature.key} sx={{ width: "40%" }}>
                  <Typography sx={{ fontWeight: "bolder" }}>{creature.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {creature.document?.displayName}
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
                      {row.higher === index && (
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                          {`+${Math.abs(row.delta)}`}
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

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, mt: 3 }}>
        {creatures.map((creature) => (
          <Box key={creature.key}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: "bolder", mb: 1 }}>
              {creature.name}
            </Typography>
            <CreatureAbilities creature={creature} sharedNames={sharedNames} stacked />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
