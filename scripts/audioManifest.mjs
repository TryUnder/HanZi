const HSK_AUDIO_PREFIX = "cmn-";
const HSK_AUDIO_EXTENSION = ".mp3";

/**
 * Normalizes a Pinyin syllable to the audio repository notation.
 *
 * - ü and u: are represented as v.
 * - j, q, x and y + v are normalized to standard u spelling.
 * - The neutral tone (5) is preserved.
 *
 * @param {string} pinyin
 * @returns {string}
 */
export function normalizePinyinSyllable(pinyin) {
  if (typeof pinyin !== "string") {
    throw new TypeError(`Invalid Pinyin syllable: ${pinyin}`);
  }

  const normalized = pinyin
    .trim()
    .toLowerCase()
    .replace(/u:/g, "v")
    .replace(/ü/g, "v")
    .replace(/^([jqxy])v/, "$1u");

  if (!/^[a-zv]+[1-5]$/.test(normalized)) {
    throw new TypeError(`Invalid toned Pinyin syllable: ${pinyin}`);
  }

  return normalized;
}

/**
 * Creates the source filename for a Chinese vocabulary item.
 *
 * @param {string} simplified
 * @returns {string}
 */
export function getHskAudioFilename(simplified) {
  if (typeof simplified !== "string" || simplified.length === 0) {
    throw new TypeError("Simplified Chinese text must be a non-empty string.");
  }

  return `${HSK_AUDIO_PREFIX}${simplified}${HSK_AUDIO_EXTENSION}`;
}

/**
 * Creates the source filename for a toned Pinyin syllable.
 *
 * @param {string} pinyin
 * @returns {string}
 */
export function getSyllableAudioFilename(pinyin) {
  const normalized = normalizePinyinSyllable(pinyin);

  return `${HSK_AUDIO_PREFIX}${normalized}${HSK_AUDIO_EXTENSION}`;
}

/**
 * Creates an application-relative audio URL.
 *
 * @param {"hsk" | "syllables"} category
 * @param {string} filename
 * @returns {string}
 */
export function createAudioUrl(category, filename) {
  if (category !== "hsk" && category !== "syllables") {
    throw new TypeError(`Unsupported audio category: ${category}`);
  }

  if (
    typeof filename !== "string" ||
    filename.length === 0 ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    throw new TypeError("Audio filename must be a non-empty filename.");
  }

  return `/audio/${category}/${encodeURIComponent(filename)}`;
}
