import type { PronunciationSyllable } from "../models/pronunciationSyllable";
import type { PronunciationSyllableRealization } from "../models/pronunciationSyllableRealization";

import { parsePinyin } from "./pinyinParser";
import { getSyllableIndexesByCharacter } from "./pinyinCharacterAlignment";
import { applyThirdToneSandhi } from "./thirdToneSandhi";
import { applyYiToneSandhi } from "./yiToneSandhi";
import { applyBuToneSandhi } from "./buToneSandhi";

export type ToneRealizationError =
  | {
      readonly code: "PARSING_FAILED";
      readonly message: string;
    }
  | {
      readonly code: "INVALID_CHARACTER_ALIGNMENT";
      readonly message: string;
    };

export type ToneRealizationResult =
  | {
      readonly success: true;
      readonly word: string;
      readonly syllables: readonly PronunciationSyllableRealization[];
    }
  | {
      readonly success: false;
      readonly error: ToneRealizationError;
    };

export function preserveLexicalTones(
  syllables: readonly PronunciationSyllable[],
): PronunciationSyllableRealization[] {
  return syllables.map((syllable) => ({
    syllable,
    surfaceTone: syllable.lexicalTone,
    appliedRules: [],
  }));
}

export function realizeWordPronunciation(
  word: string,
  pinyin: string,
): ToneRealizationResult {
  const parsed = parsePinyin(pinyin);

  if (!parsed.success) {
    return {
      success: false,
      error: {
        code: "PARSING_FAILED",
        message: parsed.error.message,
      },
    };
  }

  const initialRealizations = preserveLexicalTones(parsed.syllables);

  const characterIndexes = getSyllableIndexesByCharacter(
    word,
    initialRealizations,
  );

  if (
    new Set(characterIndexes).size !== initialRealizations.length ||
    characterIndexes.some(
      (index) => index < 0 || index >= initialRealizations.length,
    )
  ) {
    return {
      success: false,
      error: {
        code: "INVALID_CHARACTER_ALIGNMENT",
        message: `Cannot align the Pinyin syllables with the characters in "${word}".`,
      },
    };
  }

  let realizations = applyThirdToneSandhi(initialRealizations);
  realizations = applyYiToneSandhi(word, realizations);
  realizations = applyBuToneSandhi(word, realizations);

  return {
    success: true,
    word,
    syllables: realizations,
  };
}
