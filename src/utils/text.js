const LOWERCASE_WORDS = new Set(["and", "from", "of", "or", "the", "in"]);

/** "chaotic evil" → "Chaotic Evil"; small joining words stay lowercase. */
export function capitalizeWords(text) {
  if (!text) {
    return text;
  }
  return text
    .split(" ")
    .map((word, index) =>
      word.length === 0 || (index > 0 && LOWERCASE_WORDS.has(word)) ? word : capitalizeFirstLetter(word),
    )
    .join(" ");
}

/** "fire" → "Fire" */
export function capitalizeFirstLetter(text) {
  if (!text) {
    return text;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "sleightOfHand" → "Sleight of Hand" */
export function labelFromCamelCase(key) {
  return capitalizeWords(key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase());
}
