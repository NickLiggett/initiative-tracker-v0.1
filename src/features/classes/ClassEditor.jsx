import { useEffect, useMemo, useState } from "react";
import { classesApi } from "../../api/classes";
import { listClasses } from "../../api/reference";
import EditorShell from "../../components/resource/EditorShell";
import ClassForm from "./ClassForm";
import ClassStatBlock from "./ClassStatBlock";
import { blankClassDraft, classFromDraft, classProblems, draftFromClass } from "./classDraft";

/**
 * Makes a class or subclass, or changes one of the user's: a form beside a live preview.
 * `cls` is the one to change; without it a new one is made. `onSaved` gets the saved class.
 */
export default function ClassEditor({ cls, onSaved, onCancel }) {
  const [draft, setDraft] = useState(() => (cls ? draftFromClass(cls) : blankClassDraft()));
  const [classes, setClasses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    listClasses({ signal: controller.signal })
      .then(setClasses)
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError("Couldn't load the list of classes, which a subclass is chosen from. Is the backend running?");
        }
      });
    return () => controller.abort();
  }, []);

  const computed = useMemo(() => classFromDraft(draft), [draft]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      onSaved(cls?.key ? await classesApi.replace(cls.key, computed) : await classesApi.create(computed));
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <EditorShell
      title={cls?.key ? `Edit ${cls.name}` : "New class"}
      basedOn={cls?.derivedFrom}
      problems={classProblems(draft)}
      error={error}
      saving={saving}
      onSave={save}
      onCancel={onCancel}
      form={<ClassForm draft={draft} onChange={setDraft} classes={classes.filter((one) => one.key !== cls?.key)} />}
      preview={<ClassStatBlock cls={{ ...computed, name: computed.name || "Untitled class" }} />}
    />
  );
}
