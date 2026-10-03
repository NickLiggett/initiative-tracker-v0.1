import { useEffect, useMemo, useState } from "react";
import { createCreature, replaceCreature } from "../../api/creatures";
import { listConditions, listCreatureTypes, listDamageTypes, listSizes } from "../../api/reference";
import EditorShell from "../../components/resource/EditorShell";
import CreatureForm from "./CreatureForm";
import CreatureStatBlock from "./CreatureStatBlock";
import { blankDraft, creatureFromDraft, draftFromCreature, draftProblems } from "./creatureDraft";

/**
 * Makes a creature, or changes one of the user's: a form beside a live preview of the stat block.
 * `creature` is the one to change; without it a new creature is made. `onSaved` gets the saved creature.
 */
export default function CreatureEditor({ creature, onSaved, onCancel }) {
  const [draft, setDraft] = useState(() => (creature ? draftFromCreature(creature) : blankDraft()));
  const [references, setReferences] = useState({ sizes: [], types: [], damageTypes: [], conditions: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([listSizes({ signal }), listCreatureTypes({ signal }), listDamageTypes({ signal }), listConditions({ signal })])
      .then(([sizes, types, damageTypes, conditions]) => setReferences({ sizes, types, damageTypes, conditions }))
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError("Couldn't load the sizes, types, damage types and conditions. Is the backend running?");
        }
      });
    return () => controller.abort();
  }, []);

  const computed = useMemo(() => creatureFromDraft(draft), [draft]);

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
    <EditorShell
      title={creature?.key ? `Edit ${creature.name}` : "New creature"}
      basedOn={creature?.derivedFrom}
      problems={draftProblems(draft)}
      error={error}
      saving={saving}
      onSave={save}
      onCancel={onCancel}
      form={<CreatureForm draft={draft} onChange={setDraft} computed={computed} references={references} />}
      preview={<CreatureStatBlock creature={{ ...computed, name: draft.name.trim() || "Untitled creature" }} />}
    />
  );
}
