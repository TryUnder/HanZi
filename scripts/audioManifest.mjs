
const HSK_AUDIO_PREFIX = "cmn-";
const HSK_AUDIO_EXTENSION = ".mp3";

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
 * Supports ü, u:, and v notation for the same sound.
 *
 * @param {string} pinyin
 * @returns {string}
 */
export function getSyllableAudioFilename(pinyin) {
  if (typeof pinyin !== "string") {
    throw new TypeError(`Invalid toned Pinyin syllable: ${pinyin}`);
  }

  const normalized = pinyin
    .replace(/u:/gi, "v")
    .replace(/[üÜ]/g, "v")
    .toLowerCase();

  if (!/^[a-zv]+[1-5]$/.test(normalized)) {
    throw new TypeError(`Invalid toned Pinyin syllable: ${pinyin}`);
  }

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

  return `/audio/${category}/${filename}`;
}
