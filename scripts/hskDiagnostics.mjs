import { normalizePinyin } from "./pinyinNormalizer.mjs";

/**
 * Builds diagnostic information for matched HSK vocabulary.
 *
 * @param {Array<{
 *   word: string,
 *   levels: number[],
 *   entries: Array<{
 *     pinyin: string,
 *     normalizedPinyin?: string,
 *     definitions: string[]
 *   }>
 * }>} words
 */
export function buildHskDiagnostics(words) {
  const wordsInMultipleLevels = words
    .filter((word) => word.levels.length > 1)
    .map((word) => ({
      word: word.word,
      levels: [...word.levels],
    }));

  const wordsWithMultiplePronunciations = [];
  const wordsWithMultipleEntriesSamePronunciation = [];

  for (const word of words) {
    const pronunciationGroups = new Map();

    for (const entry of word.entries) {
      const normalizedPinyin =
        entry.normalizedPinyin ?? normalizePinyin(entry.pinyin);

      const group = pronunciationGroups.get(normalizedPinyin) ?? {
        normalizedPinyin,
        pinyinVariants: new Set(),
        entries: [],
      };

      group.pinyinVariants.add(entry.pinyin);
      group.entries.push(entry);

      pronunciationGroups.set(normalizedPinyin, group);
    }

    const pronunciations = [...pronunciationGroups.values()].map((group) => ({
      pinyin: group.normalizedPinyin,
      pinyinVariants: [...group.pinyinVariants],
      entriesCount: group.entries.length,
      definitions: group.entries.flatMap((entry) => entry.definitions),
    }));

    if (pronunciationGroups.size > 1) {
      wordsWithMultiplePronunciations.push({
        word: word.word,
        levels: [...word.levels],
        pronunciations,
      });
    }

    const repeatedGroups = pronunciations.filter(
      (group) => group.entriesCount > 1,
    );

    if (repeatedGroups.length > 0) {
      wordsWithMultipleEntriesSamePronunciation.push({
        word: word.word,
        levels: [...word.levels],
        pronunciations: repeatedGroups,
      });
    }
  }

  return {
    statistics: {
      wordsInMultipleLevels: wordsInMultipleLevels.length,
      wordsWithMultiplePronunciations: wordsWithMultiplePronunciations.length,
      wordsWithMultipleEntriesSamePronunciation:
        wordsWithMultipleEntriesSamePronunciation.length,
    },
    wordsInMultipleLevels,
    wordsWithMultiplePronunciations,
    wordsWithMultipleEntriesSamePronunciation,
  };
}
