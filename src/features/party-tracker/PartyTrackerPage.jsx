import { Alert, Box, Chip, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import usePartyTrackers from "./usePartyTrackers";

/** What is shown for an armor class or hit points the DM hasn't revealed. */
export const HIDDEN = "?";

const shown = (value) => (value === null || value === undefined ? HIDDEN : value);

/**
 * The fights the user's characters are in, as the DM's tracker shows them but for watching only: one table for each DM
 * whose party the user has joined. The first row is whose turn it is. A monster's AC and HP are question marks until
 * the DM reveals them; the user's own characters are marked.
 */
export default function PartyTrackerPage() {
  const { trackers, error } = usePartyTrackers();

  return (
    <Box sx={{ width: "min(900px, 90%)", mt: 5, display: "grid", gap: 2 }}>
      <Box>
        <Typography variant="h4" component="h2" sx={{ fontWeight: "bolder" }}>
          Party Tracker
        </Typography>
        <Typography color="text.secondary">
          The fights your characters are in, from the initiative tracker of the DM whose party you've joined. It updates
          by itself. Armor class and hit points show as {HIDDEN} until the DM reveals them.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {!trackers && !error && <CircularProgress aria-label="Loading" />}
      {trackers?.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: "center", mt: 2 }}>
          No DM has one of your characters in a fight right now. When one does, it shows here.
        </Typography>
      )}
      {trackers?.map((tracker) => (
        <FightTable key={tracker.dm} tracker={tracker} />
      ))}
    </Box>
  );
}

/** One DM's turn order. */
function FightTable({ tracker }) {
  return (
    <Box component="section" aria-label={`${tracker.dm}'s fight`} sx={{ display: "grid", gap: 1 }}>
      <Typography variant="h6" component="h3">
        {tracker.dm}'s fight
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label={`${tracker.dm}'s turn order`}>
          <TableHead>
            <TableRow>
              <TableCell>Initiative</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>AC</TableCell>
              <TableCell>HP</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tracker.combatants.map((combatant, index) => (
              <TableRow key={combatant.id ?? index} selected={index === 0} aria-current={index === 0 ? "true" : undefined}>
                <TableCell>{shown(combatant.initiative)}</TableCell>
                <TableCell>
                  {combatant.name}
                  {index === 0 && <Chip size="small" color="primary" label="Up now" sx={{ ml: 1 }} />}
                  {combatant.mine && <Chip size="small" variant="outlined" label="Yours" sx={{ ml: 1 }} />}
                </TableCell>
                <TableCell aria-label={combatant.ac == null ? "AC hidden" : undefined}>{shown(combatant.ac)}</TableCell>
                <TableCell aria-label={combatant.hp == null ? "HP hidden" : undefined}>{shown(combatant.hp)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
