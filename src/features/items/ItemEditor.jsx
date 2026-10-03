import { useEffect, useMemo, useState } from "react";
import { apiFor, itemsApi, magicItemsApi } from "../../api/items";
import { listDamageTypes, listItemCategories, listItemRarities, listWeaponProperties } from "../../api/reference";
import EditorShell from "../../components/resource/EditorShell";
import ItemForm from "./ItemForm";
import ItemStatBlock from "./ItemStatBlock";
import { blankItemDraft, draftFromItem, itemFromDraft, itemProblems } from "./itemDraft";

/**
 * Makes an item or magic item, or changes one of the user's: a form beside a live preview.
 * `item` is the one to change; without it a new one is made. `onSaved` gets the saved item.
 */
export default function ItemEditor({ item, onSaved, onCancel }) {
  const [draft, setDraft] = useState(() => (item ? draftFromItem(item) : blankItemDraft()));
  const [references, setReferences] = useState({ categories: [], rarities: [], damageTypes: [], weaponProperties: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([listItemCategories({ signal }), listItemRarities({ signal }), listDamageTypes({ signal }), listWeaponProperties({ signal })])
      .then(([categories, rarities, damageTypes, weaponProperties]) =>
        setReferences({ categories, rarities, damageTypes, weaponProperties }),
      )
      .catch((e) => {
        if (e.name !== "AbortError") {
          setError("Couldn't load the categories, rarities, damage types and weapon properties. Is the backend running?");
        }
      });
    return () => controller.abort();
  }, []);

  const computed = useMemo(() => itemFromDraft(draft), [draft]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const api = item ? apiFor(item) : draft.kind === "magic" ? magicItemsApi : itemsApi;
      onSaved(item?.key ? await api.replace(item.key, computed) : await api.create(computed));
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <EditorShell
      title={item?.key ? `Edit ${item.name}` : "New item"}
      basedOn={item?.derivedFrom}
      problems={itemProblems(draft)}
      error={error}
      saving={saving}
      onSave={save}
      onCancel={onCancel}
      form={<ItemForm draft={draft} onChange={setDraft} references={references} />}
      preview={<ItemStatBlock item={{ ...computed, name: computed.name || "Untitled item" }} />}
    />
  );
}
