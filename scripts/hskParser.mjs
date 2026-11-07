/**
 * Parser for HSK 2012 vocabulary lists.
 *
 * Expected format:
 * HSK1
 * 的
 * 一
 * 是
 */

/**
 * @typedef {Object} HskWord
 * @property {string} word
 * @property {1 | 2 | 3 | 4 | 5 | 6} level
 */

/**
 * @param {string} content
 * @param {number} expectedLevel
 * @returns {HskWord[]}
 */
export function parseHskFile(content, expectedLevel) {
  if (
    !Number.isInteger(expectedLevel) ||
    expectedLevel < 1 ||
    expectedLevel > 6
  ) {
    throw new Error(`Invalid HSK level: ${expectedLevel}`);
  }

  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const expectedHeader = `HSK${expectedLevel}`;

  if (lines[0] !== expectedHeader) {
    throw new Error(
      `Expected header "${expectedHeader}", received "${lines[0] ?? "empty file"}"`,
    );
  }

  const words = lines.slice(1);

  if (words.length === 0) {
    throw new Error(`HSK${expectedLevel} contains no vocabulary.`);
  }

  const uniqueWords = new Set(words);

  if (uniqueWords.size !== words.length) {
    throw new Error(`HSK${expectedLevel} contains duplicate words.`);
  }

  return words.map((word) => ({
    word,
    level: /** @type {1 | 2 | 3 | 4 | 5 | 6} */ (expectedLevel),
  }));
}

/**
 * @param {Map<number, string>} sources
 * @returns {HskWord[]}
 */
export function parseHskCollection(sources) {
  const entries = [];

  for (let level = 1; level <= 6; level += 1) {
    const content = sources.get(level);

    if (content === undefined) {
      throw new Error(`Missing source file for HSK${level}.`);
    }

    entries.push(...parseHskFile(content, level));
  }

  return entries;
}
