// Showing a background, as plain functions.

/** The kinds of benefit a background grants, as the data names them, with what to call them. */
export const BENEFIT_TYPES = [
  { value: "ability_score", label: "Ability scores" },
  { value: "skill_proficiency", label: "Skill proficiencies" },
  { value: "tool_proficiency", label: "Tool proficiencies" },
  { value: "language", label: "Languages" },
  { value: "equipment", label: "Equipment" },
  { value: "feat", label: "Feat" },
  { value: "feature", label: "Feature" },
  { value: "suggested_characteristics", label: "Suggested characteristics" },
  { value: "connection_and_memento", label: "Connection and memento" },
  { value: "adventures_and_advancement", label: "Adventures and advancement" },
];

/** What to call a benefit's type: "skill_proficiency" is "Skill proficiencies"; a type that isn't known is spelled out. */
export function benefitTypeLabel(type) {
  if (!type) {
    return "";
  }
  const known = BENEFIT_TYPES.find((one) => one.value === type);
  if (known) {
    return known.label;
  }
  const words = type.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
