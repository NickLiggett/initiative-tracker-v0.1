// Showing a species, as plain functions.

/** Open5e writes a trait's text with its own name in front: `**_Darkvision._** You can see ...`. */
const NAME_PREFIX = /^\s*\*\*_?([^*]*?)\.?_?\*\*\s*/;

/**
 * A trait's text without the name Open5e's text starts with (the name is shown on its own line), as it is when the text
 * starts with that trait's name; any other text, such as a homebrew trait's, is left as it is.
 */
export function traitBody(trait) {
  const text = trait.desc ?? "";
  const match = NAME_PREFIX.exec(text);
  if (match && match[1].trim().toLowerCase() === (trait.name ?? "").trim().toLowerCase()) {
    return text.slice(match[0].length);
  }
  return text;
}

/** "Subspecies · Volo's Guide to Monsters": what to say under a result's name. */
export function describeResult(species) {
  return [species.isSubspecies && "Subspecies", species.document?.displayName ?? species.document?.name]
    .filter(Boolean)
    .join(" · ");
}
