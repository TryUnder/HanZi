import { normalizePinyin } from "./pinyinNormalizer.mjs";

/**
 * @typedef {Object} MatchedHskWord
 * @property {string} word
 * @property {number[]} levels
 * @property {Array<{
 *   traditional: string,
 *   simplified: string,
 *   pinyin: string,
 *   normalizedPinyin: string,
 *   definitions: string[]
 * }>} entries
 */

/**
 * Matches HSK vocabulary against CC-CEDICT entries.
 *
 * All dictionary entries are preserved, including different definitions
 * and pronunciations of the same simplified word.
 *
 * @param {Array<{word: string, level: number}>} hskWords
 * @param {Array<{
 *   traditional: string,
 *   simplified: string,
 *   pinyin: string,
 *   definitions: string[]
 * }>} cedictEntries
 * @returns {{
 *   words: MatchedHskWord[],
 *   statistics: {
 *     totalHskEntries: number,
 *     uniqueHskWords: number,
 *     duplicateWordsAcrossLevels: number,
 *     matchedWords: number,
 *     unmatchedWords: number,
 *     matchedEntries: number,
 *     coveragePercentage: number
 *   }
 * }}
 */
export function matchHskWithCedict(hskWords, cedictEntries) {
  const dictionaryByWord = new Map();

  for (const entry of cedictEntries) {
    const entries = dictionaryByWord.get(entry.simplified) ?? [];

    entries.push({
      ...entry,
      normalizedPinyin: normalizePinyin(entry.pinyin),
    });

    dictionaryByWord.set(entry.simplified, entries);
  }

  const levelsByWord = new Map();

  for (const entry of hskWords) {
    const levels = levelsByWord.get(entry.word) ?? new Set();

    levels.add(entry.level);
    levelsByWord.set(entry.word, levels);
  }

  const words = [...levelsByWord.entries()]
    .map(([word, levels]) => ({
      word,
      levels: [...levels].sort((a, b) => a - b),
      entries: dictionaryByWord.get(word) ?? [],
    }))
    .sort((a, b) => a.word.localeCompare(b.word, "zh-CN"));

  const matchedWords = words.filter((entry) => entry.entries.length > 0);
  const unmatchedWords = words.filter((entry) => entry.entries.length === 0);

  const matchedEntries = matchedWords.reduce(
    (total, entry) => total + entry.entries.length,
    0,
  );

  const duplicateWordsAcrossLevels = words.filter(
    (entry) => entry.levels.length > 1,
  ).length;

  return {
    words,
    statistics: {
      totalHskEntries: hskWords.length,
      uniqueHskWords: words.length,
      duplicateWordsAcrossLevels,
      matchedWords: matchedWords.length,
      unmatchedWords: unmatchedWords.length,
      matchedEntries,
      coveragePercentage:
        words.length === 0
          ? 0
          : Number(((matchedWords.length / words.length) * 100).toFixed(2)),
    },
  };
}
