import { describe, expect, it } from "vitest";

import type { MandarinTone } from "../models/pronunciationSyllable";
import type { PronunciationSyllableRealization } from "../models/pronunciationSyllableRealization";

import { phonemizePronunciation } from "./pinyinPhonemizer";

const PHONE_SYMBOLS = [
  "n",
  "i3",
  "h",
  "ao3",
  "x",
  "ie4",
  "l",
  "sh",
  "iii1",
  "ve2",
  "j",
  "v4",
  "r",
  "iii4",
  "v",
  "iou3",
  "u3",
  "eng3",
  "e2",
  "rr",
  "ua1",
  "e5",
  "i2",
  "i1",
  "o1",
  "m",
  "a1",
  "a2",
] as const;

function createVocabulary(): Readonly<Record<string, number>> {
  return Object.fromEntries(
    PHONE_SYMBOLS.map((symbol, index) => [symbol, index + 1]),
  );
}

function createRealization(
  pinyin: string,
  lexicalTone: MandarinTone,
  options?: {
    readonly surfaceTone?: MandarinTone;
    readonly erhua?: boolean;
  },
): PronunciationSyllableRealization {
  return {
    syllable: {
      pinyin,
      lexicalTone,
      isNeutralTone: lexicalTone === 5,
      erhua: options?.erhua ?? false,
    },
    surfaceTone: options?.surfaceTone ?? lexicalTone,
    appliedRules: [],
  };
}

function getSymbols(realizations: readonly PronunciationSyllableRealization[]) {
  const result = phonemizePronunciation(realizations, createVocabulary());

  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.pronunciation.phonemes.map((phoneme) => phoneme.symbol);
}

describe("pinyinPhonemizer", () => {
  describe("basic Mandarin syllables", () => {
    it.each([
      ["ni", 3, ["n", "i3"]],
      ["hao", 3, ["h", "ao3"]],
      ["xie", 4, ["x", "ie4"]],
      ["lao", 3, ["l", "ao3"]],
      ["shi", 1, ["sh", "iii1"]],
      ["xue", 2, ["x", "ve2"]],
      ["ju", 4, ["j", "v4"]],
      ["ri", 4, ["r", "iii4"]],
      ["lü", 4, ["l", "v4"]],
    ] as const)("converts %s with tone %i", (pinyin, tone, expected) => {
      expect(getSymbols([createRealization(pinyin, tone)])).toEqual(expected);
    });
  });

  describe("special rhyme transformations", () => {
    it("converts iu into iou", () => {
      expect(getSymbols([createRealization("iu", 3)])).toEqual(["iou3"]);
    });

    it("converts ueng into two model phones", () => {
      expect(getSymbols([createRealization("ueng", 3)])).toEqual([
        "u3",
        "eng3",
      ]);
    });

    it("converts yo into the model representation of io", () => {
      expect(getSymbols([createRealization("yo", 1)])).toEqual(["i1", "o1"]);
    });

    it("converts standalone er into e plus retroflex suffix", () => {
      expect(getSymbols([createRealization("er", 2)])).toEqual(["e2", "rr"]);
    });
  });

  describe("erhua", () => {
    it("appends the erhua phones to the preceding syllable", () => {
      expect(
        getSymbols([createRealization("hua", 1, { erhua: true })]),
      ).toEqual(["h", "ua1", "e5", "rr"]);
    });

    it("does not create an additional syllable for erhua", () => {
      const result = phonemizePronunciation(
        [createRealization("hua", 1, { erhua: true })],
        createVocabulary(),
      );

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.pronunciation.syllables).toBe(1);
        expect(
          result.pronunciation.phonemes.every(
            (phoneme) => phoneme.syllableIndex === 0,
          ),
        ).toBe(true);
      }
    });
  });

  describe("tone realization", () => {
    it("uses lexical tone instead of surface tone", () => {
      expect(
        getSymbols([createRealization("ni", 3, { surfaceTone: 2 })]),
      ).toEqual(["n", "i3"]);
    });

    it("preserves lexical tones across multiple syllables", () => {
      expect(
        getSymbols([
          createRealization("ni", 3, { surfaceTone: 2 }),
          createRealization("hao", 3),
        ]),
      ).toEqual(["n", "i3", "h", "ao3"]);
    });
  });

  describe("phoneme metadata", () => {
    it("preserves syllable indexes and positions", () => {
      const result = phonemizePronunciation(
        [createRealization("ni", 3), createRealization("hao", 3)],
        createVocabulary(),
      );

      expect(result.success).toBe(true);

      if (result.success) {
        expect(
          result.pronunciation.phonemes.map((phoneme) => ({
            symbol: phoneme.symbol,
            syllableIndex: phoneme.syllableIndex,
            positionInSyllable: phoneme.positionInSyllable,
          })),
        ).toEqual([
          { symbol: "n", syllableIndex: 0, positionInSyllable: 0 },
          { symbol: "i3", syllableIndex: 0, positionInSyllable: 1 },
          { symbol: "h", syllableIndex: 1, positionInSyllable: 0 },
          { symbol: "ao3", syllableIndex: 1, positionInSyllable: 1 },
        ]);
      }
    });

    it("keeps repeated phone occurrences separate", () => {
      const result = phonemizePronunciation(
        [createRealization("ma", 1), createRealization("ma", 2)],
        {
          m: 1,
          a1: 2,
          a2: 3,
        },
      );

      expect(result.success).toBe(true);

      if (result.success) {
        expect(
          result.pronunciation.phonemes.map((phoneme) => phoneme.syllableIndex),
        ).toEqual([0, 0, 1, 1]);

        expect(result.pronunciation.phoneIds).toEqual([1, 2, 1, 3]);
      }
    });
  });

  describe("unsupported syllables", () => {
    it("rejects hng because it is not represented in Charsiu vocabulary", () => {
      const result = phonemizePronunciation(
        [createRealization("hng", 5)],
        createVocabulary(),
      );

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.code).toBe("UNSUPPORTED_SYLLABLE");
        expect(result.error.syllable).toBe("hng");
        expect(result.error.syllableIndex).toBe(0);
      }
    });
  });

  describe("error handling", () => {
    it("rejects an empty pronunciation", () => {
      const result = phonemizePronunciation([], createVocabulary());

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.code).toBe("EMPTY_PRONUNCIATION");
      }
    });

    it("reports a phone missing from the model vocabulary", () => {
      const result = phonemizePronunciation([createRealization("ni", 3)], {
        n: 1,
      });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.code).toBe("MISSING_PHONE");
        expect(result.error.phone).toBe("i3");
        expect(result.error.syllableIndex).toBe(0);
      }
    });
  });
});
