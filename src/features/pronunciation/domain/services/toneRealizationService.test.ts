import { describe, expect, it } from "vitest";

import { realizeWordPronunciation } from "./toneRealizationService";

describe("realizeWordPronunciation", () => {
  it("applies third-tone sandhi", () => {
    const result = realizeWordPronunciation("你好", "ni3 hao3");

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.syllables.map((item) => item.surfaceTone)).toEqual([2, 3]);
  });

  it("applies third-tone sandhi to consecutive third tones", () => {
    const result = realizeWordPronunciation("你好好", "ni3 hao3 hao3");

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.syllables.map((item) => item.surfaceTone)).toEqual([2, 2, 3]);
  });

  it("applies 一 sandhi before tone 4", () => {
    const result = realizeWordPronunciation("一共", "yi1 gong4");

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.syllables.map((item) => item.surfaceTone)).toEqual([2, 4]);
  });

  it("preserves tone 1 in ordinal numbers", () => {
    const result = realizeWordPronunciation("第一", "di4 yi1");

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.syllables.map((item) => item.surfaceTone)).toEqual([4, 1]);
  });

  it("applies 不 and 一 sandhi in the same word", () => {
    const result = realizeWordPronunciation("不屑一顾", "bu4 xie4 yi1 gu4");

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.syllables.map((item) => item.surfaceTone)).toEqual([
      2, 4, 2, 4,
    ]);

    expect(result.syllables[0]?.appliedRules).toContain("bu-tone-sandhi");
    expect(result.syllables[2]?.appliedRules).toContain("yi-tone-sandhi");
  });

  it("combines 一 sandhi with a following third tone", () => {
    const result = realizeWordPronunciation("一起", "yi1 qi3");

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.syllables.map((item) => item.surfaceTone)).toEqual([4, 3]);
  });

  it("handles erhua alignment", () => {
    const result = realizeWordPronunciation("一点儿", "yi1 dian3 r5");

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.syllables.map((item) => item.surfaceTone)).toEqual([4, 3]);
    expect(result.syllables[1]?.syllable.erhua).toBe(true);
  });

  it("does not apply 一 sandhi to other characters pronounced yi1", () => {
    const result = realizeWordPronunciation("依托", "yi1 tuo1");

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.syllables.map((item) => item.surfaceTone)).toEqual([1, 1]);
  });

  it("returns an error for invalid Pinyin", () => {
    const result = realizeWordPronunciation("你好", "ni hao3");

    expect(result.success).toBe(false);

    if (result.success) return;

    expect(result.error.code).toBe("PARSING_FAILED");
  });

  it("returns an error when characters and syllables cannot be aligned", () => {
    const result = realizeWordPronunciation("你好", "ni3");

    expect(result.success).toBe(false);

    if (result.success) return;

    expect(result.error.code).toBe("INVALID_CHARACTER_ALIGNMENT");
  });

  it("preserves lexical tones after all transformations", () => {
    const result = realizeWordPronunciation("不屑一顾", "bu4 xie4 yi1 gu4");

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.syllables.map((item) => item.syllable.lexicalTone)).toEqual([
      4, 4, 1, 4,
    ]);
  });

  it("combines 一 sandhi with third-tone sandhi in 一举两得", () => {
    const result = realizeWordPronunciation("一举两得", "yi1 ju3 liang3 de2");

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.syllables.map((item) => item.surfaceTone)).toEqual([
      4, 2, 3, 2,
    ]);

    expect(result.syllables[0]?.appliedRules).toContain("yi-tone-sandhi");
    expect(result.syllables[1]?.appliedRules).toContain("third-tone-sandhi");

    expect(result.syllables.map((item) => item.syllable.lexicalTone)).toEqual([
      1, 3, 3, 2,
    ]);
  });
});
