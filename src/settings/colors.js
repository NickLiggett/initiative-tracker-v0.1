// Small helpers for colors written as hex.

/**
 * A color typed as hex, as "#rrggbb" in lower case: "#ABC" → "#aabbcc", "1976D2" → "#1976d2". null if it isn't one.
 * @param {?string} text
 * @returns {?string}
 */
export function normalizeHex(text) {
  const match = typeof text === "string" ? /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim()) : null;
  if (!match) {
    return null;
  }
  const digits = match[1].length === 3 ? [...match[1]].map((digit) => digit + digit).join("") : match[1];
  return `#${digits.toLowerCase()}`;
}

/** How bright a color looks, from 0 (black) to 1 (white), as the web accessibility guidelines (WCAG) work it out. */
function luminance(hex) {
  const [red, green, blue] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/**
 * How well two colors stand apart, from 1 (the same) to 21 (black on white). 3 is the least the guidelines ask for
 * things like buttons and borders, and 4.5 for text.
 * @param {string} first "#rrggbb"
 * @param {string} second "#rrggbb"
 */
export function contrastRatio(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
