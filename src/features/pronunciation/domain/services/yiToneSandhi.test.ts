import { describe, expect, it } from "vitest";

import { parsePinyin } from "./pinyinParser";
import { preserveLexicalTones } from "./toneRealizationService";
import { applyYiToneSandhi } from "./yiToneSandhi";

function realize(word: string, pinyin: string) {
  const parsed = parsePinyin(pinyin);

  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }

  return applyYiToneSandhi(word, preserveLexicalTones(parsed.syllables));
}

describe("applyYiToneSandhi", () => {
  it("changes 一 to tone 2 before tone 4", () => {
    const result = realize("一共", "yi1 gong4");

    expect(result.map((item) => item.surfaceTone)).toEqual([2, 4]);
  });

  it("changes 一 to tone 4 before tone 1", () => {
    const result = realize("一边", "yi1 bian1");

    expect(result.map((item) => item.surfaceTone)).toEqual([4, 1]);
  });

  it("changes 一 to tone 4 before tone 3", () => {
    const result = realize("一起", "yi1 qi3");

    expect(result.map((item) => item.surfaceTone)).toEqual([4, 3]);
  });

  it("does not change 一 in ordinal numbers", () => {
    const result = realize("第一", "di4 yi1");

    expect(result.map((item) => item.surfaceTone)).toEqual([4, 1]);
  });

  it("preserves the tone of 一 at the end of a word", () => {
    const result = realize("万一", "wan4 yi1");

    expect(result.map((item) => item.surfaceTone)).toEqual([4, 1]);
  });

  it("does not modify syllables pronounced yi1 when written with other characters", () => {
    const result = realize("依托", "yi1 tuo1");

    expect(result.map((item) => item.surfaceTone)).toEqual([1, 1]);
  });

  it("handles erhua without shifting character-to-syllable alignment", () => {
    const result = realize("一点儿", "yi1 dian3 r5");

    expect(result.map((item) => item.surfaceTone)).toEqual([4, 3]);
    expect(result[1]?.syllable.erhua).toBe(true);
  });

  it("preserves lexical tones after applying the rule", () => {
    const result = realize("一共", "yi1 gong4");

    expect(result.map((item) => item.syllable.lexicalTone)).toEqual([1, 4]);
    expect(result[0]?.appliedRules).toContain("yi-tone-sandhi");
  });

  it("does not mutate the original realizations", () => {
    const parsed = parsePinyin("yi1 gong4");

    if (!parsed.success) {
      throw new Error(parsed.error.message);
    }

    const original = preserveLexicalTones(parsed.syllables);

    applyYiToneSandhi("一共", original);

    expect(original.map((item) => item.surfaceTone)).toEqual([1, 4]);
  });

  it("changes 一 to tone 4 before tone 2", () => {
    const result = realize("一切", "yi1 qie4");

    expect(result.map((item) => item.surfaceTone)).toEqual([2, 4]);
  });

  it("changes 一 to tone 4 before tone 1 in 一帆风顺", () => {
    const result = realize("一帆风顺", "yi1 fan1 feng1 shun4");

    expect(result.map((item) => item.surfaceTone)).toEqual([4, 1, 1, 4]);
  });

  it("preserves 一 in 第一", () => {
    const result = realize("第一", "di4 yi1");

    expect(result.map((item) => item.surfaceTone)).toEqual([4, 1]);
    expect(result[1]?.appliedRules).not.toContain("yi-tone-sandhi");
  });

  it("preserves 一 in 万一", () => {
    const result = realize("万一", "wan4 yi1");

    expect(result.map((item) => item.surfaceTone)).toEqual([4, 1]);
    expect(result[1]?.appliedRules).not.toContain("yi-tone-sandhi");
  });

  it("preserves non-tone-one readings of 一", () => {
    const result = realize("一共", "yi4 gong4");

    expect(result.map((item) => item.surfaceTone)).toEqual([4, 4]);
    expect(result[0]?.appliedRules).not.toContain("yi-tone-sandhi");
  });
});
