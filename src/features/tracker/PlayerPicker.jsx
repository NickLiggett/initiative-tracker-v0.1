import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { Casino } from "@mui/icons-material";
import { listPartyPlayers } from "../../api/party";
import { listPlayers } from "../../api/players";
import { describePlayer, formatBonus } from "../players/players";
import { parseInitiative, playerCombatant, rollInitiative } from "./playerCombatants";

/**
 * Pick player characters, yours and your party's, and say what each rolled for initiative; they go into the order with
 * their armor class and hit points filled in. Players already in the order can't be added twice.
 *
 * @param {boolean} open
 * @param {Set<number>} inFight the ids of the players already in the order
 * @param {(combatants: object[]) => void} onAdd the combatants to add (without ids)
 * @param {() => void} onClose
 * @param {() => number} [random] the dice, for tests
 */
export default function PlayerPicker({ open, inFight, onAdd, onClose, random = Math.random }) {
  const [players, setPlayers] = useState(null); // { mine, party }; null until loaded
  const [loadError, setLoadError] = useState(null);
  const [chosen, setChosen] = useState({}); // player id -> the initiative typed, for those ticked
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const controller = new AbortController();
    setPlayers(null);
    setLoadError(null);
    setChosen({});
    setTried(false);
    // The party is a bonus: without it you still have your own players.
    Promise.all([listPlayers({ signal: controller.signal }), listPartyPlayers({ signal: controller.signal }).catch(() => [])])
      .then(([mine, party]) => setPlayers({ mine, party }))
      .catch((e) => {
        if (e.name !== "AbortError") {
          setLoadError(e.status === 401 ? "Sign in to add players." : "Couldn't load your players. Is the backend running?");
        }
      });
    return () => controller.abort();
  }, [open]);

  const all = useMemo(() => [...(players?.mine ?? []), ...(players?.party ?? [])], [players]);
  const ticked = all.filter((player) => player.id in chosen);
  const missing = ticked.filter((player) => parseInitiative(chosen[player.id]) === null);

  const toggle = (player) =>
    setChosen((current) => {
      const { [player.id]: removed, ...rest } = current;
      return removed === undefined ? { ...current, [player.id]: "" } : rest;
    });
  const setInitiative = (player, text) => setChosen((current) => ({ ...current, [player.id]: text }));
  const roll = (player) => setInitiative(player, String(rollInitiative(player.initiativeBonus, random)));
  const rollAll = () => setChosen((current) => Object.fromEntries(all.filter((p) => p.id in current).map((p) => [p.id, String(rollInitiative(p.initiativeBonus, random))])));

  const add = () => {
    setTried(true);
    if (ticked.length === 0 || missing.length > 0) {
      return;
    }
    onAdd(ticked.map((player) => playerCombatant(player, parseInitiative(chosen[player.id]))));
  };

  const row = (player) => {
    const here = inFight.has(player.id);
    const on = player.id in chosen;
    const bad = tried && on && parseInitiative(chosen[player.id]) === null;
    return (
      <Box component="li" key={player.id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
        <Checkbox
          checked={on}
          disabled={here}
          onChange={() => toggle(player)}
          inputProps={{ "aria-label": `Add ${player.name}` }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ overflowWrap: "anywhere" }}>{player.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {here
              ? "Already in the fight"
              : [
                  describePlayer(player),
                  player.armorClass == null ? null : `AC ${player.armorClass}`,
                  player.hitPoints == null ? null : `HP ${player.hitPoints}`,
                  player.role === "PARTY" ? `from ${player.playedBy ?? player.owner}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </Typography>
        </Box>
        {on && (
          <>
            <TextField
              size="small"
              label="Initiative"
              inputProps={{ "aria-label": `Initiative for ${player.name}`, inputMode: "numeric" }}
              value={chosen[player.id]}
              error={bad}
              helperText={`${formatBonus(player.initiativeBonus)} bonus`}
              onChange={(event) => setInitiative(player, event.target.value)}
              sx={{ width: 110 }}
            />
            <Button size="small" aria-label={`Roll for ${player.name}`} startIcon={<Casino />} onClick={() => roll(player)}>
              Roll
            </Button>
          </>
        )}
      </Box>
    );
  };

  const list = (label, items) =>
    items.length > 0 && (
      <Box component="section" aria-label={label} sx={{ mb: 2 }}>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {items.map(row)}
        </Box>
      </Box>
    );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="player-picker-title">
      <DialogTitle id="player-picker-title">Add players to initiative</DialogTitle>
      <DialogContent>
        {loadError && <Alert severity="error">{loadError}</Alert>}
        {!players && !loadError && <CircularProgress aria-label="Loading" />}
        {players && all.length === 0 && (
          <Typography color="text.secondary">
            You don't have any players yet. Make some on the Players page, or join a party.
          </Typography>
        )}
        {players && (
          <>
            {list("Your players", players.mine)}
            {list("Your party's players", players.party)}
            {tried && ticked.length === 0 && all.length > 0 && <Alert severity="info">Tick the players to add.</Alert>}
            {tried && missing.length > 0 && <Alert severity="warning">Give every ticked player an initiative, or roll for them.</Alert>}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={rollAll} disabled={ticked.length === 0}>
          Roll for all ticked
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={add} disabled={!players || all.length === 0}>
          Add to initiative
        </Button>
      </DialogActions>
    </Dialog>
  );
}
