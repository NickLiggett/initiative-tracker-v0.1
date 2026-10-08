// The species editor's form state, and turning it into what open5e-backend stores for a species.
//
// A draft starts from an existing species (when editing or duplicating); what the form doesn't show (a trait's type and
// order, for instance) is kept.

let lastTraitId = 0;

/** A trait for the form: the source's `{name, desc, type, order}` with an id of its own, to keep each in its place. */
export function newTrait(trait = {}) {
  return {
    id: `trait-${++lastTraitId}`,
    name: trait.name ?? "",
    desc: trait.desc ?? "",
    type: trait.type ?? null,
    order: trait.order ?? null,
  };
}

export function blankSpeciesDraft() {
  return { name: "", desc: "", isSubspecies: false, subspeciesOfKey: null, traits: [] };
}

export function draftFromSpecies(species) {
  return {
    name: species.name ?? "",
    desc: species.desc ?? "",
    isSubspecies: Boolean(species.isSubspecies),
    subspeciesOfKey: species.subspeciesOfKey ?? null,
    traits: (species.traits ?? []).map(newTrait),
  };
}

/** What stops this draft from being saved: sentences, none when it can be. */
export function speciesProblems(draft) {
  const problems = [];
  if (!draft.name.trim()) {
    problems.push("Give the species a name.");
  }
  if (draft.isSubspecies && !draft.subspeciesOfKey) {
    problems.push("Choose the species this is a subspecies of.");
  }
  draft.traits.forEach((trait, index) => {
    if (!trait.name.trim() || !trait.desc.trim()) {
      problems.push(`Trait ${index + 1} needs a name and a description.`);
    }
  });
  return problems;
}

/** The body to send the backend. */
export function speciesFromDraft(draft) {
  return {
    name: draft.name.trim(),
    desc: draft.desc.trim() || null,
    isSubspecies: draft.isSubspecies,
    subspeciesOfKey: draft.isSubspecies ? draft.subspeciesOfKey : null,
    traits: draft.traits.map(({ name, desc, type, order }) => ({ name: name.trim(), desc: desc.trim(), type, order })),
  };
}

/** The list with the item at `from` moved to `to`, or the list itself if that isn't a move. */
export function moveItem(list, from, to) {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const moved = [...list];
  const [item] = moved.splice(from, 1);
  moved.splice(to, 0, item);
  return moved;
}
