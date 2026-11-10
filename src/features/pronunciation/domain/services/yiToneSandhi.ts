import type { PronunciationSyllableRealization } from "../models/pronunciationSyllableRealization";
import { getSyllableIndexesByCharacter } from "./pinyinCharacterAlignment";

export function applyYiToneSandhi(
  word: string,
  realizations: readonly PronunciationSyllableRealization[],
): PronunciationSyllableRealization[] {
  const characters = Array.from(word);

  const syllableIndexes = getSyllableIndexesByCharacter(word, realizations);

  return realizations.map((current, index) => {
    const characterIndex = syllableIndexes.indexOf(index);

    if (
      characterIndex === -1 ||
      characters[characterIndex] !== "一" ||
      current.syllable.lexicalTone !== 1 ||
      characters[characterIndex - 1] === "第"
    ) {
      return current;
    }

    const next = realizations[index + 1];

    if (!next) {
      return current;
    }

    const surfaceTone = next.syllable.lexicalTone === 4 ? 2 : 4;

    return {
      ...current,
      surfaceTone,
      appliedRules: [...current.appliedRules, "yi-tone-sandhi"],
    };
  });
}
