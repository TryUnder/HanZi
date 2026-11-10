import type { PronunciationSyllableRealization } from "../models/pronunciationSyllableRealization";
import { getSyllableIndexesByCharacter } from "./pinyinCharacterAlignment";

export function applyBuToneSandhi(
  word: string,
  realizations: readonly PronunciationSyllableRealization[],
): PronunciationSyllableRealization[] {
  const characters = Array.from(word);

  const syllableIndexes = getSyllableIndexesByCharacter(word, realizations);

  return realizations.map((current, index) => {
    const characterIndex = syllableIndexes.indexOf(index);

    if (
      characterIndex === -1 ||
      characters[characterIndex] !== "不" ||
      current.syllable.lexicalTone !== 4
    ) {
      return current;
    }

    const next = realizations[index + 1];

    if (!next || next.syllable.lexicalTone !== 4) {
      return current;
    }

    return {
      ...current,
      surfaceTone: 2,
      appliedRules: [...current.appliedRules, "bu-tone-sandhi"],
    };
  });
}
