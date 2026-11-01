import { Fragment, useEffect, useMemo, useState } from "react";
import { Autocomplete, Box, Button, IconButton, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { Add, Close } from "@mui/icons-material";
import { createPlayer, updatePlayer } from "../../api/players";
import { listClasses, listSpecies } from "../../api/reference";
import EditorShell from "../../components/resource/EditorShell";
import FormSection from "../../components/resource/FormSection";
import { useSettings } from "../../settings/SettingsContext";
import { sharingErrorMessage } from "../sharing/sharing";
import PlayerCard from "./PlayerCard";
import SubclassField from "./SubclassField";
import { EMPTY_DRAFT, draftProblems, previewOf, toDraft, toRequest, totalLevel } from "./playerDraft";
import { RULESETS, optionNamed, optionsFor } from "./players";

/**
 * Makes a new character or changes one. A character can have several classes, each with its own level. Classes and
 * species are offered from every source the user can see, those of the chosen rules first, and anything else can be
 * typed. Someone who only plays the character can change its levels, numbers and notes, and nothing else.
 *
 * @param {?object} player the one to change, or null for a new one
 * @param {object} [start] the draft to begin with, for a copy; otherwise empty, or the character's
 * @param {(player: object) => void} onSaved
 * @param {() => void} onCancel
 */
export default function PlayerEditor({ player, start, onSaved, onCancel }) {
  const [draft, setDraft] = useState(() => start ?? (player ? toDraft(player) : EMPTY_DRAFT));
  const [classes, setClasses] = useState([]);
  const [species, setSpecies] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notLoaded, setNotLoaded] = useState([]); // which of the lists couldn't be loaded
  const { username } = useSettings();

  const limited = Boolean(player) && player.role !== "OWNER"; // only plays it
  const classOptions = useMemo(() => optionsFor(classes, draft.ruleset), [classes, draft.ruleset]);
  const speciesOptions = useMemo(() => optionsFor(species, draft.ruleset), [species, draft.ruleset]);
  const problems = draftProblems(draft);

  useEffect(() => {
    const controller = new AbortController();
    // The lists are a convenience: without them the names can still be typed, but the user is told.
    const failed = (what) => (e) => e.name !== "AbortError" && setNotLoaded((current) => [...current, what]);
    listClasses({ signal: controller.signal }).then(setClasses).catch(failed("classes"));
    listSpecies({ signal: controller.signal }).then(setSpecies).catch(failed("species"));
    return () => controller.abort();
  }, []);

  const change = (changes) => setDraft((current) => ({ ...current, ...changes }));
  const text = (field) => (event) => change({ [field]: event.target.value });

  /** Typing or picking a name forgets the key it had; the key is found again when saving (see `save`). */
  const changeName = (nameField, keyField) => (value) => change({ [nameField]: value, [keyField]: null });

  const changeClass = (index, changes) =>
    setDraft((current) => ({ ...current, classes: current.classes.map((row, at) => (at === index ? { ...row, ...changes } : row)) }));
  const addClass = () => change({ classes: [...draft.classes, { key: null, name: "", level: "1", subclassKey: null, subclassName: "" }] });
  const removeClass = (index) => change({ classes: draft.classes.filter((row, at) => at !== index) });

  const changeRuleset = (ruleset) => {
    if (ruleset && ruleset !== draft.ruleset) {
      // The same name can be another resource under other rules (the 2024 Fighter), so the keys are found again.
      change({ ruleset, classes: draft.classes.map((row) => ({ ...row, key: null, subclassKey: null, subclassName: "" })), speciesKey: null });
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      // The key is the one the name had when the character was opened, or else the rule set's class or species of that name
      // (looked up now, so that it doesn't matter whether the lists had loaded when the name was typed).
      const request = toRequest({
        ...draft,
        classes: draft.classes.map((row) => ({ ...row, key: row.key ?? optionNamed(classOptions, row.name)?.key ?? null })),
        speciesKey: draft.speciesKey ?? optionNamed(speciesOptions, draft.speciesName)?.key ?? null,
      });
      onSaved(player ? await updatePlayer(player.id, { ...request, version: player.version }) : await createPlayer(request));
    } catch (e) {
      setError(sharingErrorMessage(e, draft.playedBy.trim().replace(/^@+/, "").toLowerCase()));
      setSaving(false);
    }
  };

  /** A name to type or pick from `options` (grouped by where they come from); `onName` is told what it is now. */
  const nameField = (label, value, onName, options) => (
    <Autocomplete
      freeSolo
      size="small"
      disabled={limited}
      options={options}
      groupBy={(option) => option.group}
      getOptionLabel={(option) => (typeof option === "string" ? option : option.name)}
      renderOption={(props, option) => (
        <li {...props} key={option.key}>
          {option.name}
        </li>
      )}
      inputValue={value}
      onInputChange={(event, next) => next !== value && onName(next)}
      renderInput={(params) => <TextField {...params} label={label} />}
      sx={{ flex: 1 }}
    />
  );

  const several = draft.classes.length > 1;
  const total = totalLevel(draft);

  return (
    <EditorShell
      title={player ? `Edit ${player.name}` : "New Character Creation"}
      problems={problems}
      error={error}
      saving={saving}
      onSave={save}
      onCancel={onCancel}
      form={
        <Box sx={{ display: "grid", gap: 2, alignContent: "start" }}>
          <FormSection title="The Character">
            {limited && (
              <Typography variant="body2" color="text.secondary">
                {player.owner} made this character. You can keep its numbers and notes up to date; the rest is theirs to change.
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
            {nameField("Species", draft.speciesName, changeName("speciesName", "speciesKey"), speciesOptions)}
            {notLoaded.length > 0 && (
              <Typography variant="caption" color="warning.main">
                Couldn't load the list of {notLoaded.join(" and ")}, so only names you type are kept. Reload the page to try again.
              </Typography>
            )}
          </FormSection>

          <FormSection title="Class and level">
            {draft.classes.map((row, index) => (
              <Fragment key={index}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                {nameField(index === 0 ? "Class" : `Class ${index + 1}`, row.name, (name) => changeClass(index, { name, key: null, subclassKey: null, subclassName: "" }), classOptions)}
                <TextField
                  size="small"
                  label={index === 0 ? "Level" : `Level ${index + 1}`}
                  value={row.level}
                  onChange={(event) => changeClass(index, { level: event.target.value })}
                  inputProps={{ inputMode: "numeric" }}
                  sx={{ width: 90 }}
                />
                {several && !limited && (
                  <IconButton aria-label={`Remove class ${index + 1}`} size="small" onClick={() => removeClass(index)} sx={{ mt: 0.5 }}>
                    <Close fontSize="small" />
                  </IconButton>
                )}
              </Box>
              {(row.key ?? optionNamed(classOptions, row.name)?.key) && (
                <SubclassField
                  classKey={row.key ?? optionNamed(classOptions, row.name).key}
                  label={several ? `Subclass of ${row.name.trim()}` : "Subclass"}
                  value={row.subclassName ?? ""}
                  onChange={(changes) => changeClass(index, changes)}
                />
              )}
              </Fragment>
            ))}
            {!limited && (
              <Box>
                <Button size="small" startIcon={<Add />} onClick={addClass}>
                  Add a class
                </Button>
              </Box>
            )}
            {several && !Number.isNaN(total) && (
              <Typography variant="body2" color="text.secondary">
                Level {total} in all.
              </Typography>
            )}
          </FormSection>

          <FormSection title="Numbers">
            <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
              <TextField size="small" label="Hit points" value={draft.hitPoints} onChange={text("hitPoints")} inputProps={{ inputMode: "numeric" }} />
            </Box>
            <Typography variant="caption" color="text.secondary">
              Armor class and initiative are worked out on the sheet, from the abilities and what is equipped.
            </Typography>
            <TextField size="small" label="Notes" value={draft.notes} multiline minRows={3} inputProps={{ maxLength: 5000 }} onChange={text("notes")} />
          </FormSection>

          <FormSection title="The Player">
            <Typography>{draft.playedBy ? `Played by ${draft.playedBy}.` : "Nobody plays this character yet."}</Typography>
            {!limited && (
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {username && draft.playedBy !== username && (
                  <Button size="small" onClick={() => change({ playedBy: username })}>
                    Assign to me
                  </Button>
                )}
                {draft.playedBy && (
                  <Button size="small" onClick={() => change({ playedBy: "" })}>
                    Unassign from me
                  </Button>
                )}
              </Box>
            )}
            <Typography variant="caption" color="text.secondary">
              To have a friend play this character, use Request assignment on its card once it's saved. They get an email and
              play it only if they accept.
            </Typography>
          </FormSection>
        </Box>
      }
      preview={<PlayerCard player={previewOf(draft, player)} />}
    />
  );
}
