// Showing a feat, as plain functions.

/** The kinds of feat, as the 2024 rules group them. */
export const FEAT_TYPES = ["General", "Origin", "Fighting Style", "Epic Boon"];

/** A feat's type as to read: Open5e writes some in capitals ("GENERAL"), which is "General" here. */
export function featTypeLabel(type) {
  if (!type) {
    return "";
  }
  return type === type.toUpperCase() ? type.charAt(0) + type.slice(1).toLowerCase() : type;
}

/** "General feat · 5e 2024 Rules": what to say under a result's name. */
export function describeResult(feat) {
  return [feat.type && `${featTypeLabel(feat.type)} feat`, feat.document?.displayName ?? feat.document?.name].filter(Boolean).join(" · ");
}
