// The feat editor's form state, and turning it into what open5e-backend stores for a feat.
//
// A draft starts from an existing feat (when editing or duplicating); what the form doesn't show (a benefit's cross
// references, for instance) is kept.

let lastBenefitId = 0;

/** A benefit for the form: the source's `{desc}` (a feat's benefits only have text) with an id of its own. */
export function newBenefit(benefit = {}) {
  return {
    id: `feat-benefit-${++lastBenefitId}`,
    name: benefit.name ?? null,
    desc: benefit.desc ?? "",
    type: benefit.type ?? null,
    crossreferences: benefit.crossreferences ?? null,
  };
}

export function blankFeatDraft() {
  return { name: "", type: "General", prerequisite: "", desc: "", benefits: [] };
}

export function draftFromFeat(feat) {
  return {
    name: feat.name ?? "",
    type: feat.type ?? "",
    prerequisite: feat.prerequisite ?? "",
    desc: feat.desc ?? "",
    benefits: (feat.benefits ?? []).map(newBenefit),
  };
}

/** What stops this draft from being saved: sentences, none when it can be. */
export function featProblems(draft) {
  const problems = [];
  if (!draft.name.trim()) {
    problems.push("Give the feat a name.");
  }
  draft.benefits.forEach((benefit, index) => {
    if (!benefit.desc.trim()) {
      problems.push(`Benefit ${index + 1} needs a description.`);
    }
  });
  return problems;
}

/** The body to send the backend. A feat has a prerequisite when one is written. */
export function featFromDraft(draft) {
  const prerequisite = draft.prerequisite.trim();
  return {
    name: draft.name.trim(),
    type: draft.type || null,
    hasPrerequisite: prerequisite !== "",
    prerequisite: prerequisite || null,
    desc: draft.desc.trim() || null,
    benefits: draft.benefits.map(({ name, desc, type, crossreferences }) => ({ name, desc: desc.trim(), type, crossreferences })),
  };
}
