import { useEffect, useMemo, useState } from "react";
import { Autocomplete, Box, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { createPlayer, updatePlayer } from "../../api/players";
import { listClasses, listSpecies } from "../../api/reference";
import EditorShell from "../../components/resource/EditorShell";
import FormSection from "../../components/resource/FormSection";
import { sharingErrorMessage } from "../sharing/sharing";
import PlayerCard from "./PlayerCard";
import { EMPTY_DRAFT, draftProblems, previewOf, toDraft, toRequest } from "./playerDraft";
import { RULESETS, optionNamed, optionsFor } from "./players";

/**
 * Makes a new player character or changes one. Class and species are offered for the chosen rules, and anything else
 * can be typed. Someone who only plays the character can change its numbers and notes, and nothing else.
 *
 * @param {?object} player the one to change, or null for a new one
 * @param {object} [start] the draft to begin with, for a copy; otherwise empty, or the player's
 * @param {(player: object) => void} onSaved
 * @param {() => void} onCancel
 */
export default function PlayerEditor({ player, start, onSaved, onCancel }) {
  const [draft, setDraft] = useState(() => start ?? (player ? toDraft(player) : EMPTY_DRAFT));
  const [classes, setClasses] = useState([]);
  const [species, setSpecies] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const limited = Boolean(player) && player.role !== "OWNER"; // only plays it
  const classOptions = useMemo(() => optionsFor(classes, draft.ruleset), [classes, draft.ruleset]);
  const speciesOptions = useMemo(() => optionsFor(species, draft.ruleset), [species, draft.ruleset]);
  const problems = draftProblems(draft);

  useEffect(() => {
    const controller = new AbortController();
    // The lists are a convenience: without them the names can still be typed.
    listClasses({ signal: controller.signal }).then(setClasses).catch(() => {});
    listSpecies({ signal: controller.signal }).then(setSpecies).catch(() => {});
    return () => controller.abort();
  }, []);

  const change = (changes) => setDraft((current) => ({ ...current, ...changes }));
  const text = (field) => (event) => change({ [field]: event.target.value });

  /** Typing or picking a name forgets the key it had; the key is found again when saving (see `save`). */
  const changeName = (nameField, keyField) => (value) => change({ [nameField]: value, [keyField]: null });

  const changeRuleset = (ruleset) => {
    if (ruleset && ruleset !== draft.ruleset) {
      // The same name can be another resource under other rules (the 2024 Fighter), so the keys are found again.
      change({ ruleset, classKey: null, speciesKey: null });
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      // The key is the one the name had when the player was opened, or else the rule set's class or species of that name
      // (looked up now, so that it doesn't matter whether the lists had loaded when the name was typed).
      const request = toRequest({
        ...draft,
        classKey: draft.classKey ?? optionNamed(classOptions, draft.className)?.key ?? null,
        speciesKey: draft.speciesKey ?? optionNamed(speciesOptions, draft.speciesName)?.key ?? null,
      });
      onSaved(player ? await updatePlayer(player.id, request) : await createPlayer(request));
    } catch (e) {
      setError(sharingErrorMessage(e, draft.playedBy.trim().replace(/^@+/, "").toLowerCase()));
      setSaving(false);
    }
  };

  const nameFields = (nameField, keyField, options, label) => (
    <Autocomplete
      freeSolo
      size="small"
      disabled={limited}
      options={options.map((option) => option.name)}
      inputValue={draft[nameField]}
      onInputChange={(event, value) => value !== draft[nameField] && changeName(nameField, keyField)(value)}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );

  return (
    <EditorShell
      title={player ? `Edit ${player.name}` : "New player"}
      problems={problems}
      error={error}
      saving={saving}
      onSave={save}
      onCancel={onCancel}
      form={
        <Box sx={{ display: "grid", gap: 2, alignContent: "start" }}>
          <FormSection title="Who they are">
            {limited && (
              <Typography variant="body2" color="text.secondary">
                {player.owner} made this player. You can keep its numbers and notes up to date; the rest is theirs to change.
              </Typography>
            )}
            <TextField size="small" label="Name" value={draft.name} disabled={limited} inputProps={{ maxLength: 60 }} onChange={text("name")} />
            <Box>
              <Typography variant="caption" color="text.secondary" component="p" sx={{ mb: 0.5 }}>
                Rules
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                aria-label="Rules"
                value={draft.ruleset}
                disabled={limited}
                onChange={(event, ruleset) => changeRuleset(ruleset)}
              >
                {RULESETS.map(({ key, label }) => (
                  <ToggleButton key={key} value={key}>
                    {label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
            {nameFields("className", "classKey", classOptions, "Class")}
            {nameFields("speciesName", "speciesKey", speciesOptions, "Species")}
          </FormSection>

          <FormSection title="Numbers">
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
              <TextField size="small" label="Level" value={draft.level} onChange={text("level")} inputProps={{ inputMode: "numeric" }} />
              <TextField size="small" label="Armor class" value={draft.armorClass} onChange={text("armorClass")} inputProps={{ inputMode: "numeric" }} />
              <TextField size="small" label="Hit points" value={draft.hitPoints} onChange={text("hitPoints")} inputProps={{ inputMode: "numeric" }} />
              <TextField size="small" label="Initiative bonus" value={draft.initiativeBonus} onChange={text("initiativeBonus")} inputProps={{ inputMode: "numeric" }} />
            </Box>
            <TextField size="small" label="Notes" value={draft.notes} multiline minRows={3} inputProps={{ maxLength: 5000 }} onChange={text("notes")} />
          </FormSection>

          <FormSection title="Who plays them">
            <TextField
              size="small"
              label="Played by (username)"
              value={draft.playedBy}
              disabled={limited}
              onChange={text("playedBy")}
              helperText="Optional. They need to have signed in to the app once. They'll see this player and can keep its numbers up to date."
            />
          </FormSection>
        </Box>
      }
      preview={<PlayerCard player={previewOf(draft, player)} />}
    />
  );
}
