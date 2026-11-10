import { describe, expect, it } from "vitest";
import type {
  VocabularyEntry,
  VocabularyLearningData,
} from "../../types/vocabulary";
import { createVocabularyDisplay, formatPinyin } from "./vocabularyDisplay";

const vocabularyEntry: VocabularyEntry = {
  id: "vocab-4f60",
  simplified: "你",
  traditionalVariants: ["你"],
  hskLevels: [1],
  readings: [
    {
      pinyin: "ni3",
      sourcePinyinVariants: ["Ni3"],
      entries: [
        {
          traditional: "你",
          definitions: ["you", "your"],
        },
      ],
    },
  ],
  audioUrl: null,
};

const verifiedLearningData: VocabularyLearningData = {
  status: "verified",
  meanings: ["ty", "twoja", "twój"],
  examples: [
    {
      simplified: "你好",
      pinyin: "ni3 hao3",
      meaning: "Cześć",
    },
  ],
  notes: ["Common second-person pronoun."],
};

describe("formatPinyin", () => {
  it("formats first, second, third and fourth tones", () => {
    expect(formatPinyin("ma1 ma2 ma3 ma4")).toBe("mā má mǎ mà");
  });

  it("formats neutral tone without a tone mark", () => {
    expect(formatPinyin("ma5")).toBe("ma");
  });

  it("formats multiple syllables", () => {
    expect(formatPinyin("ni3 hao3")).toBe("nǐ hǎo");
  });

  it("places tone marks according to Pinyin vowel rules", () => {
    expect(formatPinyin("liu4 gui3")).toBe("liù guǐ");
    expect(formatPinyin("hao3 xue2")).toBe("hǎo xué");
  });

  it("normalizes alternative ü notation", () => {
    expect(formatPinyin("lv4")).toBe("lǜ");
    expect(formatPinyin("lu:4")).toBe("lǜ");
  });

  it("normalizes uppercase Pinyin", () => {
    expect(formatPinyin("NI3 HAO3")).toBe("nǐ hǎo");
  });

  it("returns an empty string for empty input", () => {
    expect(formatPinyin("")).toBe("");
  });
});

describe("createVocabularyDisplay", () => {
  it("preserves source Pinyin alongside formatted pronunciation", () => {
    const result = createVocabularyDisplay(vocabularyEntry);

    expect(result.readings[0]?.sourcePinyin).toBe("ni3");
    expect(result.readings[0]?.pinyin).toBe("nǐ");
  });

  it("preserves vocabulary identity and character variants", () => {
    const result = createVocabularyDisplay(vocabularyEntry);

    expect(result.id).toBe("vocab-4f60");
    expect(result.simplified).toBe("你");
    expect(result.traditionalVariants).toEqual(["你"]);
    expect(result.hskLevels).toEqual([1]);
  });

  it("uses source definitions when learning data is unavailable", () => {
    const result = createVocabularyDisplay(vocabularyEntry);

    expect(result.meanings).toEqual(["you", "your"]);
    expect(result.readings[0]?.definitions).toEqual(["you", "your"]);
  });

  it("uses verified learning meanings when provided", () => {
    const result = createVocabularyDisplay(
      vocabularyEntry,
      verifiedLearningData,
    );

    expect(result.meanings).toEqual(["ty", "twoja", "twój"]);
    expect(result.isVerified).toBe(true);
  });

  it("preserves examples and notes from learning data", () => {
    const result = createVocabularyDisplay(
      vocabularyEntry,
      verifiedLearningData,
    );

    expect(result.examples).toEqual(verifiedLearningData.examples);
    expect(result.notes).toEqual(verifiedLearningData.notes);
  });

  it("marks vocabulary without verified learning data as unverified", () => {
    const result = createVocabularyDisplay(vocabularyEntry);

    expect(result.isVerified).toBe(false);
  });

  it("removes duplicate meanings", () => {
    const entry: VocabularyEntry = {
      ...vocabularyEntry,
      readings: [
        {
          pinyin: "ni3",
          sourcePinyinVariants: [],
          entries: [
            {
              traditional: "你",
              definitions: ["you", "you"],
            },
            {
              traditional: "妳",
              definitions: ["you", "your"],
            },
          ],
        },
      ],
    };

    const result = createVocabularyDisplay(entry);

    expect(result.meanings).toEqual(["you", "your"]);
    expect(result.readings[0]?.definitions).toEqual(["you", "your"]);
    expect(result.readings[0]?.traditionalForms).toEqual(["你", "妳"]);
  });

  it("does not modify the original vocabulary entry", () => {
    const original = structuredClone(vocabularyEntry);

    createVocabularyDisplay(vocabularyEntry, verifiedLearningData);

    expect(vocabularyEntry).toEqual(original);
  });

  it("preserves the original audio URL", () => {
    const entry: VocabularyEntry = {
      ...vocabularyEntry,
      audioUrl: "/audio/ni.mp3",
    };

    const result = createVocabularyDisplay(entry);

    expect(result.audioUrl).toBe("/audio/ni.mp3");
  });
});
