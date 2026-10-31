import { useState } from "react";
import { Alert, Box, Chip, CircularProgress, MenuItem, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import usePartyTrackers from "./usePartyTrackers";

/** What is shown for an armor class or hit points the DM hasn't revealed. */
export const HIDDEN = "?";

/** Which tracker an entry is: a DM can have several, and only one of them is live. */
const trackerKey = (tracker) => `${tracker.dm}#${tracker.trackerId ?? "live"}`;
const isLive = (tracker) => tracker.live !== false;
const trackerLabel = (tracker) =>
  `${tracker.dm}${tracker.name ? `: ${tracker.name}` : ""}${isLive(tracker) ? "" : " (saved)"}`;

const shown = (value) => (value === null || value === undefined ? HIDDEN : value);

/**
 * The fights the user's characters are in, as the DM's tracker shows them but for watching only: one table for each DM
 * whose party the user has joined. The first row is whose turn it is. A monster's AC and HP are question marks until
 * the DM reveals them; the user's own characters are marked.
 */
export default function PartyTrackerPage() {
  const { trackers, error } = usePartyTrackers();
  const [chosen, setChosen] = useState(null); // the key of the tracker the user picked
  const showing = trackers?.find((tracker) => trackerKey(tracker) === chosen) ?? trackers?.[0];

  return (
    <Box sx={{ width: "min(900px, 90%)", mt: 5, display: "grid", gap: 2 }}>
      <Box>
        <Typography variant="h4" component="h2" sx={{ fontWeight: "bolder" }}>
          Player View
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
      {trackers?.length > 1 && (
        <TextField
          select
          size="small"
          label="Tracker"
          value={trackerKey(showing)}
          onChange={(event) => setChosen(event.target.value)}
          helperText="Your characters are in more than one tracker. Pick which to watch."
        >
          {trackers.map((tracker) => (
            <MenuItem key={trackerKey(tracker)} value={trackerKey(tracker)}>
              {trackerLabel(tracker)}
            </MenuItem>
          ))}
        </TextField>
      )}
      {showing && <FightTable key={trackerKey(showing)} tracker={showing} />}
    </Box>
  );
}

/** One DM's turn order. */
function FightTable({ tracker }) {
  return (
    <Box component="section" aria-label={`${tracker.dm}'s fight`} sx={{ display: "grid", gap: 1 }}>
      <Typography variant="h6" component="h3">
        {tracker.dm}'s fight
        {tracker.name && `: ${tracker.name}`}
        {!isLive(tracker) && <Chip size="small" variant="outlined" label="Saved, not live" sx={{ ml: 1 }} />}
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small" aria-label={`${tracker.dm}'s turn order`}>
          <TableHead>
            <TableRow>
              <TableCell>Initiative</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>AC</TableCell>
              <TableCell>HP</TableCell>
              <TableCell>Conditions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tracker.combatants.map((combatant, index) => (
              <TableRow key={combatant.id ?? index} selected={index === 0} aria-current={index === 0 ? "true" : undefined}>
                <TableCell>{shown(combatant.initiative)}</TableCell>
                <TableCell>
                  {combatant.name ?? "Unknown creature"}
                  {index === 0 && <Chip size="small" color="primary" label="Up now" sx={{ ml: 1 }} />}
                  {combatant.mine && <Chip size="small" variant="outlined" label="Yours" sx={{ ml: 1 }} />}
                </TableCell>
                <TableCell aria-label={combatant.ac == null ? "AC hidden" : undefined}>{shown(combatant.ac)}</TableCell>
                <TableCell aria-label={combatant.hp == null ? "HP hidden" : undefined}>{shown(combatant.hp)}</TableCell>
                <TableCell>
                  <Box component="ul" aria-label={`Conditions of ${combatant.name ?? "unknown creature"}`} sx={{ listStyle: "none", m: 0, p: 0, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {(combatant.conditions ?? []).map((condition) => (
                      <Box component="li" key={condition}>
                        <Chip size="small" color="warning" label={condition} />
                      </Box>
                    ))}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
