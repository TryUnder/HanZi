import type { PronunciationSyllableRealization } from "../models/pronunciationSyllableRealization";

export function getSyllableIndexesByCharacter(
  word: string,
  realizations: readonly PronunciationSyllableRealization[],
): readonly number[] {
  const characters = Array.from(word);
  const indexes: number[] = [];
  let syllableIndex = 0;

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];

    if (
      character === "儿" &&
      index > 0 &&
      realizations[syllableIndex - 1]?.syllable.erhua
    ) {
      indexes.push(syllableIndex - 1);
      continue;
    }

    indexes.push(syllableIndex);
    syllableIndex += 1;
  }

  return indexes;
}
