import { useMemo, useState } from "react";
import { Box, TextField } from "@mui/material";
import { backgroundsApi } from "../../api/backgrounds";
import EditorShell from "../../components/resource/EditorShell";
import FormSection from "../../components/resource/FormSection";
import ItemsEditor from "../../components/resource/ItemsEditor";
import BackgroundStatBlock from "./BackgroundStatBlock";
import {
  backgroundFromDraft,
  backgroundProblems,
  blankBackgroundDraft,
  draftFromBackground,
  newBenefit,
} from "./backgroundDraft";
import { BENEFIT_TYPES } from "./backgroundFormat";

/**
 * Makes a background, or changes one of the user's: a form beside a live preview.
 * `background` is the one to change; without it a new one is made. `onSaved` gets the saved background.
 */
export default function BackgroundEditor({ background, onSaved, onCancel }) {
  const [draft, setDraft] = useState(() => (background ? draftFromBackground(background) : blankBackgroundDraft()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const change = (changes) => setDraft((current) => ({ ...current, ...changes }));
  const body = useMemo(() => backgroundFromDraft(draft), [draft]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      onSaved(background?.key ? await backgroundsApi.replace(background.key, body) : await backgroundsApi.create(body));
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <EditorShell
      title={background?.key ? `Edit ${background.name}` : "New background"}
      basedOn={background?.derivedFrom}
      problems={backgroundProblems(draft)}
      error={error}
      saving={saving}
      onSave={save}
      onCancel={onCancel}
      form={
        <Box sx={{ display: "grid", gap: 2, alignContent: "start" }}>
          <FormSection title="The background">
            <TextField size="small" label="Background name" value={draft.name} onChange={(event) => change({ name: event.target.value })} />
            <TextField
              size="small"
              label="Description"
              multiline
              minRows={3}
              value={draft.desc}
              onChange={(event) => change({ desc: event.target.value })}
              helperText="A few sentences about this background. **bold** and *italic* work."
            />
          </FormSection>

          <FormSection title="Benefits">
            <ItemsEditor
              noun="benefit"
              items={draft.benefits}
              onChange={(benefits) => change({ benefits })}
              newItem={newBenefit}
              emptyText="No benefits yet: skill proficiencies, tool proficiencies, languages, equipment, a feature, and so on."
              renderFields={(benefit, changeBenefit) => (
                <>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      size="small"
                      label="Benefit name"
                      value={benefit.name}
                      onChange={(event) => changeBenefit({ name: event.target.value })}
                      sx={{ flex: 1 }}
                    />
                    <TypeSelect value={benefit.type} onChange={(type) => changeBenefit({ type })} />
                  </Box>
                  <TextField
                    size="small"
                    label="Benefit description"
                    multiline
                    minRows={2}
                    value={benefit.desc}
                    onChange={(event) => changeBenefit({ desc: event.target.value })}
                  />
                </>
              )}
            />
          </FormSection>
        </Box>
      }
      preview={<BackgroundStatBlock background={{ ...body, key: background?.key, name: body.name || "Untitled background" }} />}
    />
  );
}

/** What kind of benefit it is, or none. A type the list doesn't know (from another source) stays as it is. */
function TypeSelect({ value, onChange }) {
  const unknown = value && !BENEFIT_TYPES.some((one) => one.value === value);
  return (
    <TextField
      select
      size="small"
      SelectProps={{ native: true }}
      InputLabelProps={{ shrink: true }}
      label="Benefit type"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value || null)}
      sx={{ minWidth: 190 }}
    >
      <option value="">None</option>
      {unknown && <option value={value}>{value}</option>}
      {BENEFIT_TYPES.map((one) => (
        <option key={one.value} value={one.value}>
          {one.label}
        </option>
      ))}
    </TextField>
  );
}
