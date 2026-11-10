import { describe, expect, it } from "vitest";
import vocabularyData from "../../../library/data/vocabulary.json";

import type { VocabularyEntry } from "../../../library/types/vocabulary";

import { parsePinyin } from "./pinyinParser";

const vocabulary = vocabularyData as VocabularyEntry[];

describe("Pinyin parser integration with vocabulary database", () => {
  it("parses every canonical vocabulary reading", () => {
    const failures: string[] = [];

    let readingCount = 0;

    for (const entry of vocabulary) {
      for (const reading of entry.readings) {
        readingCount += 1;

        const result = parsePinyin(reading.pinyin);

        if (!result.success) {
          failures.push(
            `${entry.simplified} (${entry.id}) — ${reading.pinyin}: ${result.error.message}`,
          );
        }
      }
    }

    expect(readingCount).toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });

  it("parses every source Pinyin variant", () => {
    const failures: string[] = [];

    let variantCount = 0;

    for (const entry of vocabulary) {
      for (const reading of entry.readings) {
        for (const variant of reading.sourcePinyinVariants) {
          variantCount += 1;

          const result = parsePinyin(variant);

          if (!result.success) {
            failures.push(
              `${entry.simplified} (${entry.id}) — ${variant}: ${result.error.message}`,
            );
          }
        }
      }
    }

    expect(variantCount).toBeGreaterThan(0);
    expect(failures).toEqual([]);
  });

  it("represents neutral tones and erhua in parsed syllables", () => {
    const neutralToneReadings: string[] = [];
    const erhuaReadings: string[] = [];

    for (const entry of vocabulary) {
      for (const reading of entry.readings) {
        const result = parsePinyin(reading.pinyin);

        if (!result.success) {
          continue;
        }

        if (result.syllables.some((syllable) => syllable.isNeutralTone)) {
          neutralToneReadings.push(reading.pinyin);
        }

        if (result.syllables.some((syllable) => syllable.erhua)) {
          erhuaReadings.push(reading.pinyin);
        }
      }
    }

    expect(neutralToneReadings.length).toBeGreaterThan(0);
    expect(erhuaReadings.length).toBeGreaterThan(0);
  });
});
