import { useEffect, useMemo, useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, IconButton, Paper, TextField, Tooltip, Typography } from "@mui/material";
import { Add, ArrowDownward, ArrowUpward, Delete } from "@mui/icons-material";
import { getSpecies, searchSpecies, speciesApi } from "../../api/species";
import EditorShell from "../../components/resource/EditorShell";
import FormSection from "../../components/resource/FormSection";
import ResourceSearch from "../../components/resource/ResourceSearch";
import SpeciesStatBlock from "./SpeciesStatBlock";
import { blankSpeciesDraft, draftFromSpecies, moveItem, newTrait, speciesFromDraft, speciesProblems } from "./speciesDraft";

// Only species that aren't subspecies themselves can be a subspecies' parent. Defined here so the search stays the same
// function between renders (see ResourceSearch).
const searchBaseSpecies = (text, { signal }) => searchSpecies(text, { isSubspecies: false, signal });

/**
 * Makes a species or subspecies, or changes one of the user's: a form beside a live preview.
 * `species` is the one to change; without it a new one is made. `onSaved` gets the saved species.
 */
export default function SpeciesEditor({ species, onSaved, onCancel }) {
  const [draft, setDraft] = useState(() => (species ? draftFromSpecies(species) : blankSpeciesDraft()));
  const [parent, setParent] = useState(null); // the chosen parent species, as search results give it
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // When changing a subspecies, find its parent, to show by name.
  useEffect(() => {
    if (!species?.isSubspecies || !species.subspeciesOfKey) {
      return undefined;
    }
    const controller = new AbortController();
    getSpecies(species.subspeciesOfKey, { signal: controller.signal })
      .then(setParent)
      .catch(() => {});
    return () => controller.abort();
  }, [species]);

  const change = (changes) => setDraft((current) => ({ ...current, ...changes }));
  const changeTrait = (id, changes) =>
    change({ traits: draft.traits.map((trait) => (trait.id === id ? { ...trait, ...changes } : trait)) });
  const body = useMemo(() => speciesFromDraft(draft), [draft]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      onSaved(species?.key ? await speciesApi.replace(species.key, body) : await speciesApi.create(body));
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <EditorShell
      title={species?.key ? `Edit ${species.name}` : "New species"}
      basedOn={species?.derivedFrom}
      problems={speciesProblems(draft)}
      error={error}
      saving={saving}
      onSave={save}
      onCancel={onCancel}
      form={
        <Box sx={{ display: "grid", gap: 2, alignContent: "start" }}>
          <FormSection title="The species">
            <TextField size="small" label="Species name" value={draft.name} onChange={(event) => change({ name: event.target.value })} />
            <FormControlLabel
              control={
                <Checkbox
                  checked={draft.isSubspecies}
                  onChange={(event) => {
                    change({ isSubspecies: event.target.checked, ...(!event.target.checked && { subspeciesOfKey: null }) });
                    if (!event.target.checked) {
                      setParent(null);
                    }
                  }}
                />
              }
              label="This is a subspecies of another species"
            />
            {draft.isSubspecies && (
              <ResourceSearch
                noun="species"
                plural="species"
                label="Subspecies of"
                search={searchBaseSpecies}
                value={parent}
                onChange={(chosen) => {
                  setParent(chosen);
                  change({ subspeciesOfKey: chosen?.key ?? null });
                }}
                fullWidth
              />
            )}
            <TextField
              size="small"
              label="Description"
              multiline
              minRows={3}
              value={draft.desc}
              onChange={(event) => change({ desc: event.target.value })}
              helperText="A few sentences about who they are. **bold** and *italic* work."
            />
          </FormSection>

          <FormSection title="Traits">
            {draft.traits.length === 0 && (
              <Typography color="text.secondary">No traits yet: ability score increases, speed, darkvision, and so on.</Typography>
            )}
            {draft.traits.map((trait, index) => (
              <Paper key={trait.id} variant="outlined" role="group" aria-label={`Trait ${index + 1}`} sx={{ p: 1.5, display: "grid", gap: 1 }}>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <TextField
                    size="small"
                    label="Trait name"
                    value={trait.name}
                    onChange={(event) => changeTrait(trait.id, { name: event.target.value })}
                    sx={{ flex: 1 }}
                  />
                  <Tooltip title="Move up">
                    <span>
                      <IconButton aria-label={`Move trait ${index + 1} up`} disabled={index === 0} onClick={() => change({ traits: moveItem(draft.traits, index, index - 1) })}>
                        <ArrowUpward />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Move down">
                    <span>
                      <IconButton
                        aria-label={`Move trait ${index + 1} down`}
                        disabled={index === draft.traits.length - 1}
                        onClick={() => change({ traits: moveItem(draft.traits, index, index + 1) })}
                      >
                        <ArrowDownward />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Remove trait">
                    <IconButton aria-label={`Remove trait ${index + 1}`} onClick={() => change({ traits: draft.traits.filter((one) => one.id !== trait.id) })}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </Box>
                <TextField
                  size="small"
                  label="Trait description"
                  multiline
                  minRows={2}
                  value={trait.desc}
                  onChange={(event) => changeTrait(trait.id, { desc: event.target.value })}
                />
              </Paper>
            ))}
            <Box>
              <Button startIcon={<Add />} onClick={() => change({ traits: [...draft.traits, newTrait()] })}>
                Add trait
              </Button>
            </Box>
          </FormSection>
        </Box>
      }
      preview={<SpeciesStatBlock species={{ ...body, key: species?.key, name: body.name || "Untitled species" }} />}
    />
  );
}
