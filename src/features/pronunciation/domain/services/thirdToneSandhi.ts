import type { PronunciationSyllableRealization } from "../models/pronunciationSyllableRealization";

export function applyThirdToneSandhi(
  syllables: readonly PronunciationSyllableRealization[],
): PronunciationSyllableRealization[] {
  return syllables.map((current, index) => {
    const next = syllables[index + 1];

    if (current.surfaceTone !== 3 || next?.surfaceTone !== 3) {
      return current;
    }

    return {
      ...current,
      surfaceTone: 2,
      appliedRules: [...current.appliedRules, "third-tone-sandhi"],
    };
  });
}
