import characterData from "./characters.json";
import type { ChineseCharacter } from "../types/character";

function validateCharacters(data: unknown): ChineseCharacter[] {
  if (!Array.isArray(data)) {
    throw new Error("Invalid character database: expected an array.");
  }

  return data.map((entry: unknown, index: number) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("tone" in entry) ||
      !("hskLevel" in entry) ||
      !("strokes" in entry)
    ) {
      throw new Error(`Invalid character data at index ${index}.`);
    }

    const tone = entry.tone;
    const hskLevel = entry.hskLevel;
    const strokes = entry.strokes;

    if (
      ![1, 2, 3, 4, 5].includes(tone as number) ||
      ![1, 2, 3, 4, 5, 6].includes(hskLevel as number) ||
      typeof strokes !== "number" ||
      !Number.isInteger(strokes) ||
      strokes <= 0
    ) {
      throw new Error(`Invalid character metadata at index ${index}.`);
    }

    return entry as ChineseCharacter;
  });
}

export const characters = validateCharacters(characterData);
