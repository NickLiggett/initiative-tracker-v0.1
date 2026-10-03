import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Typography } from "@mui/material";
import { createCreature, replaceCreature } from "../../api/creatures";
import { listCreatureTypes, listSizes } from "../../api/reference";
import CreatureForm from "./CreatureForm";
import CreatureStatBlock from "./CreatureStatBlock";
import { blankDraft, creatureFromDraft, draftFromCreature, draftProblems } from "./creatureDraft";

/**
 * Makes a creature, or changes one of the user's: a form beside a live preview of the stat block.
 * `creature` is the one to change; without it a new creature is made. `onSaved` gets the saved creature.
 */
export default function CreatureEditor({ creature, onSaved, onCancel }) {
  const [draft, setDraft] = useState(() => (creature ? draftFromCreature(creature) : blankDraft()));
  const [sizes, setSizes] = useState([]);
  const [types, setTypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([listSizes({ signal: controller.signal }), listCreatureTypes({ signal: controller.signal })])
      .then(([loadedSizes, loadedTypes]) => {
        setSizes(loadedSizes);
        setTypes(loadedTypes);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError("Couldn't load the sizes and types. Is the backend running?");
        }
      });
    return () => controller.abort();
  }, []);

  const preview = useMemo(() => ({ ...creatureFromDraft(draft), name: draft.name.trim() || "Untitled creature" }), [draft]);
  const problems = draftProblems(draft);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = creatureFromDraft(draft);
      onSaved(creature?.key ? await replaceCreature(creature.key, body) : await createCreature(body));
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" component="h2">
            {creature?.key ? `Edit ${creature.name}` : "New creature"}
          </Typography>
          {problems.length > 0 && (
            <Typography variant="body2" color="text.secondary" role="status">
              {problems.join(" ")}
            </Typography>
          )}
          {creature?.derivedFrom && (
            <Typography variant="caption" color="text.secondary">
              Based on {creature.derivedFrom}
            </Typography>
          )}
        </Box>
        <Button onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={saving || problems.length > 0}>
          Save
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1fr)" } }}>
        <CreatureForm draft={draft} onChange={setDraft} sizes={sizes} types={types} />
        <Box sx={{ position: { lg: "sticky" }, top: 16, alignSelf: "start" }} aria-label="Preview">
          <Typography variant="overline" color="text.secondary">
            Preview
          </Typography>
          <CreatureStatBlock creature={preview} />
        </Box>
      </Box>
    </Box>
  );
}
