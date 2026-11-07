/**
 * Normalizes CC-CEDICT Pinyin notation for consistent comparisons.
 *
 * Examples:
 *   Yi3  -> yi3
 *   lv4  -> lü4
 *   lu:4 -> lü4
 *
 * Tone numbers are preserved.
 *
 * @param {string} pinyin
 * @returns {string}
 */
export function normalizePinyin(pinyin) {
  if (typeof pinyin !== "string") {
    throw new TypeError("Pinyin must be a string.");
  }

  return pinyin
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/u:/g, "ü")
    .replace(/v/g, "ü")
    .replace(/\s+/g, " ");
}
