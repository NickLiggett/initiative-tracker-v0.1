import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, FormControlLabel, Checkbox, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import CreatureInfoDialog from "../creatures/CreatureInfoDialog";
import CreatureSearch from "../creatures/CreatureSearch";
import DifficultyMeter from "./DifficultyMeter";
import MonsterList from "./MonsterList";
import PartySelector from "./PartySelector";
import { byInitiative, monsterCombatants, playerCombatants } from "./encounterCombatants";
import { ENCOUNTER_RULESETS, clampLevel, creatureXp } from "./encounterRules";
import { addToSavedTracker } from "./trackerHandoff";
import useParty from "./useParty";

/**
 * Builds an encounter: who the party is, which creatures are in it, and how hard that is by the 2014 or the 2024 rules.
 * "Add to initiative tracker" rolls initiative for the monsters (and the ticked players) and puts them in the tracker.
 *
 * @param {() => void} onOpenTracker shows the initiative tracker, once the combatants are in it
 */
export default function EncountersPage({ onOpenTracker }) {
  const { players, loadError } = useParty();
  const [ticked, setTicked] = useState(null); // the ids of the players ticked; everyone, until they have chosen
  const [extras, setExtras] = useState([]);
  const [monsters, setMonsters] = useState([]);
  const [ruleset, setRuleset] = useState(ENCOUNTER_RULESETS[0].key);
  const [searchKey, setSearchKey] = useState(0);
  const [shown, setShown] = useState(null);
  const [includePlayers, setIncludePlayers] = useState(true);
  const [separately, setSeparately] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Everyone is in the party until the user chooses; and if they all use one set of rules, so does the encounter.
  useEffect(() => {
    if (!players) {
      return;
    }
    setTicked((current) => current ?? new Set(players.map((player) => player.id)));
    const rules = new Set(players.map((player) => player.ruleset));
    if (rules.size === 1 && ENCOUNTER_RULESETS.some((one) => one.key === [...rules][0])) {
      setRuleset([...rules][0]);
    }
  }, [players]);

  const included = useMemo(() => (players ?? []).filter((player) => ticked?.has(player.id)), [players, ticked]);
  const levels = useMemo(() => [...included.map((player) => clampLevel(player.level)), ...extras.map((extra) => extra.level)], [included, extras]);
  const counted = useMemo(() => monsters.map(({ creature, count }) => ({ xp: creatureXp(creature), count })), [monsters]);

  const toggle = (id) =>
    setTicked((current) => {
      const next = new Set(current);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  const addExtra = (level) => setExtras((current) => [...current, { id: (current.at(-1)?.id ?? 0) + 1, level }]);

  const addCreature = (creature) => {
    if (!creature) {
      return;
    }
    setMonsters((current) =>
      current.some((one) => one.creature.key === creature.key)
        ? current.map((one) => (one.creature.key === creature.key ? { ...one, count: one.count + 1 } : one))
        : [...current, { creature, count: 1 }],
    );
    setSearchKey((key) => key + 1); // a fresh search box, ready for the next creature
  };
  const setCount = (key, count) => setMonsters((current) => current.map((one) => (one.creature.key === key ? { ...one, count } : one)));
  const remove = (key) => setMonsters((current) => current.filter((one) => one.creature.key !== key));

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      const fighters = [...monsterCombatants(monsters, { separately }), ...(includePlayers ? playerCombatants(included) : [])];
      await addToSavedTracker(byInitiative(fighters));
      onOpenTracker();
    } catch (e) {
      setError(`Couldn't add them to the tracker: ${e.message}`);
      setSending(false);
    }
  };

  return (
    <Box sx={{ width: "100%", maxWidth: 1000, p: 2, boxSizing: "border-box", display: "grid", gap: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h5" component="h1" sx={{ flex: 1 }}>
          Encounter
        </Typography>
        <ToggleButtonGroup exclusive size="small" value={ruleset} onChange={(event, value) => value && setRuleset(value)} aria-label="Rules">
          {ENCOUNTER_RULESETS.map((one) => (
            <ToggleButton key={one.key} value={one.key} sx={{ textTransform: "none" }}>
              {one.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <PartySelector
        players={players}
        loadError={loadError}
        ticked={ticked ?? new Set()}
        onToggle={toggle}
        extras={extras}
        onAddExtra={addExtra}
        onRemoveExtra={(id) => setExtras((current) => current.filter((extra) => extra.id !== id))}
      />

      <Box component="section" aria-label="Creatures">
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
          The creatures
        </Typography>
        <CreatureSearch key={searchKey} value={null} onChange={addCreature} fullWidth />
        <Box sx={{ mt: 1 }}>
          <MonsterList monsters={monsters} onCount={setCount} onRemove={remove} onShow={setShown} />
        </Box>
      </Box>

      <DifficultyMeter ruleset={ruleset} levels={levels} monsters={counted} />

      <Box component="section" aria-label="Initiative">
        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Button variant="contained" disabled={monsters.length === 0 || sending} onClick={send}>
            Add to initiative tracker
          </Button>
          <FormControlLabel
            control={<Checkbox checked={includePlayers} onChange={(event) => setIncludePlayers(event.target.checked)} />}
            label="Include the ticked players"
          />
          <FormControlLabel
            control={<Checkbox checked={separately} onChange={(event) => setSeparately(event.target.checked)} />}
            label="Roll for each monster separately"
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          Initiative is rolled for you, and they are added after whoever is already in the tracker.
        </Typography>
      </Box>

      {shown && <CreatureInfoDialog open creature={shown} onClose={() => setShown(null)} />}
    </Box>
  );
}
