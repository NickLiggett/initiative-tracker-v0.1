// The background editor's form state, and turning it into what open5e-backend stores for a background.
//
// A draft starts from an existing background (when editing or duplicating); what the form doesn't show (a benefit's
// cross references, for instance) is kept.

let lastBenefitId = 0;

/** A benefit for the form: the source's `{name, desc, type, crossreferences}` with an id of its own. */
export function newBenefit(benefit = {}) {
  return {
    id: `benefit-${++lastBenefitId}`,
    name: benefit.name ?? "",
    desc: benefit.desc ?? "",
    type: benefit.type ?? null,
    crossreferences: benefit.crossreferences ?? { to: [] },
  };
}

export function blankBackgroundDraft() {
  return { name: "", desc: "", benefits: [] };
}

export function draftFromBackground(background) {
  return {
    name: background.name ?? "",
    desc: background.desc ?? "",
    benefits: (background.benefits ?? []).map(newBenefit),
  };
}

/** What stops this draft from being saved: sentences, none when it can be. */
export function backgroundProblems(draft) {
  const problems = [];
  if (!draft.name.trim()) {
    problems.push("Give the background a name.");
  }
  draft.benefits.forEach((benefit, index) => {
    if (!benefit.name.trim() || !benefit.desc.trim()) {
      problems.push(`Benefit ${index + 1} needs a name and a description.`);
    }
  });
  return problems;
}

/** The body to send the backend. */
export function backgroundFromDraft(draft) {
  return {
    name: draft.name.trim(),
    desc: draft.desc.trim() || null,
    benefits: draft.benefits.map(({ name, desc, type, crossreferences }) => ({ name: name.trim(), desc: desc.trim(), type, crossreferences })),
  };
}
