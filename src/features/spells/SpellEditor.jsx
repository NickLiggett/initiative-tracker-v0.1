import { useEffect, useMemo, useState } from "react";
import { spellsApi } from "../../api/spells";
import { listClasses, listDamageTypes, listSpellSchools } from "../../api/reference";
import EditorShell from "../../components/resource/EditorShell";
import SpellForm from "./SpellForm";
import SpellStatBlock from "./SpellStatBlock";
import { blankSpellDraft, draftFromSpell, spellFromDraft, spellProblems } from "./spellDraft";

/**
 * Makes a spell, or changes one of the user's: a form beside a live preview.
 * `spell` is the one to change; without it a new one is made. `onSaved` gets the saved spell.
 */
export default function SpellEditor({ spell, onSaved, onCancel }) {
  const [draft, setDraft] = useState(() => (spell ? draftFromSpell(spell) : blankSpellDraft()));
  const [references, setReferences] = useState({ schools: [], classes: [], damageTypes: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([listSpellSchools({ signal }), listClasses({ signal }), listDamageTypes({ signal })])
      .then(([schools, classes, damageTypes]) => setReferences({ schools, classes, damageTypes }))
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError("Couldn't load the schools, classes and damage types. Is the backend running?");
        }
      });
    return () => controller.abort();
  }, []);

  const computed = useMemo(() => spellFromDraft(draft), [draft]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      onSaved(spell?.key ? await spellsApi.replace(spell.key, computed) : await spellsApi.create(computed));
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <EditorShell
      title={spell?.key ? `Edit ${spell.name}` : "New spell"}
      basedOn={spell?.derivedFrom}
      problems={spellProblems(draft)}
      error={error}
      saving={saving}
      onSave={save}
      onCancel={onCancel}
      form={<SpellForm draft={draft} onChange={setDraft} references={references} />}
      preview={<SpellStatBlock spell={{ ...computed, name: computed.name || "Untitled spell" }} />}
    />
  );
}
