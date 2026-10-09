import { useMemo, useState } from "react";
import { Box, TextField } from "@mui/material";
import { featsApi } from "../../api/feats";
import EditorShell from "../../components/resource/EditorShell";
import FormSection from "../../components/resource/FormSection";
import ItemsEditor from "../../components/resource/ItemsEditor";
import FeatStatBlock from "./FeatStatBlock";
import { blankFeatDraft, draftFromFeat, featFromDraft, featProblems, newBenefit } from "./featDraft";
import { FEAT_TYPES, featTypeLabel } from "./featFormat";

/**
 * Makes a feat, or changes one of the user's: a form beside a live preview.
 * `feat` is the one to change; without it a new one is made. `onSaved` gets the saved feat.
 */
export default function FeatEditor({ feat, onSaved, onCancel }) {
  const [draft, setDraft] = useState(() => (feat ? draftFromFeat(feat) : blankFeatDraft()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const change = (changes) => setDraft((current) => ({ ...current, ...changes }));
  const body = useMemo(() => featFromDraft(draft), [draft]);
  // A type the list doesn't have (from another source) stays as it is.
  const types = draft.type && !FEAT_TYPES.includes(draft.type) ? [draft.type, ...FEAT_TYPES] : FEAT_TYPES;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      onSaved(feat?.key ? await featsApi.replace(feat.key, body) : await featsApi.create(body));
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <EditorShell
      title={feat?.key ? `Edit ${feat.name}` : "New feat"}
      basedOn={feat?.derivedFrom}
      problems={featProblems(draft)}
      error={error}
      saving={saving}
      onSave={save}
      onCancel={onCancel}
      form={
        <Box sx={{ display: "grid", gap: 2, alignContent: "start" }}>
          <FormSection title="The feat">
            <TextField size="small" label="Feat name" value={draft.name} onChange={(event) => change({ name: event.target.value })} />
            <TextField
              select
              size="small"
              SelectProps={{ native: true }}
              InputLabelProps={{ shrink: true }}
              label="Feat type"
              value={draft.type}
              onChange={(event) => change({ type: event.target.value })}
            >
              <option value="">None</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {featTypeLabel(type)}
                </option>
              ))}
            </TextField>
            <TextField
              size="small"
              label="Prerequisite"
              value={draft.prerequisite}
              onChange={(event) => change({ prerequisite: event.target.value })}
              helperText="Leave empty if there is none, e.g. Strength 13 or higher."
            />
            <TextField
              size="small"
              label="Description"
              multiline
              minRows={3}
              value={draft.desc}
              onChange={(event) => change({ desc: event.target.value })}
              helperText="What the feat is about. **bold** and *italic* work."
            />
          </FormSection>

          <FormSection title="Benefits">
            <ItemsEditor
              noun="benefit"
              items={draft.benefits}
              onChange={(benefits) => change({ benefits })}
              newItem={newBenefit}
              emptyText="No benefits yet: each is one thing the feat gives."
              renderFields={(benefit, changeBenefit) => (
                <TextField
                  size="small"
                  label="Benefit description"
                  multiline
                  minRows={2}
                  value={benefit.desc}
                  onChange={(event) => changeBenefit({ desc: event.target.value })}
                />
              )}
            />
          </FormSection>
        </Box>
      }
      preview={<FeatStatBlock feat={{ ...body, key: feat?.key, name: body.name || "Untitled feat" }} />}
    />
  );
}
