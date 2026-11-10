import { describe, expect, it } from "vitest";

import { parsePinyin } from "./pinyinParser";
import { preserveLexicalTones } from "./toneRealizationService";
import { applyBuToneSandhi } from "./buToneSandhi";

function realize(word: string, pinyin: string) {
  const parsed = parsePinyin(pinyin);

  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }

  return applyBuToneSandhi(word, preserveLexicalTones(parsed.syllables));
}

describe("applyBuToneSandhi", () => {
  it("changes 不 to tone 2 before tone 4", () => {
    const result = realize("不是", "bu4 shi4");

    expect(result.map((item) => item.surfaceTone)).toEqual([2, 4]);
  });

  it("preserves tone 4 before tone 1", () => {
    const result = realize("不多", "bu4 duo1");

    expect(result.map((item) => item.surfaceTone)).toEqual([4, 1]);
  });

  it("preserves tone 4 before tone 2", () => {
    const result = realize("不难", "bu4 nan2");

    expect(result.map((item) => item.surfaceTone)).toEqual([4, 2]);
  });

  it("preserves tone 4 before tone 3", () => {
    const result = realize("不好", "bu4 hao3");

    expect(result.map((item) => item.surfaceTone)).toEqual([4, 3]);
  });

  it("preserves tone 4 before a neutral tone", () => {
    const result = realize("不行", "bu4 xing2");

    expect(result.map((item) => item.surfaceTone)).toEqual([4, 2]);
  });

  it("preserves tone 4 when 不 is the final syllable", () => {
    const result = realize("不", "bu4");

    expect(result.map((item) => item.surfaceTone)).toEqual([4]);
  });

  it("does not modify other syllables pronounced bu4", () => {
    const result = realize("布衣", "bu4 yi1");

    expect(result.map((item) => item.surfaceTone)).toEqual([4, 1]);
  });

  it("preserves lexical tones after applying the rule", () => {
    const result = realize("不是", "bu4 shi4");

    expect(result.map((item) => item.syllable.lexicalTone)).toEqual([4, 4]);
    expect(result[0]?.appliedRules).toContain("bu-tone-sandhi");
  });

  it("preserves neutral tone 不 in 对不起", () => {
    const result = realize("对不起", "dui4 bu5 qi3");

    expect(result.map((item) => item.surfaceTone)).toEqual([4, 5, 3]);
    expect(result[1]?.appliedRules).not.toContain("bu-tone-sandhi");
  });

  it("preserves neutral tone 不 in 了不起", () => {
    const result = realize("了不起", "liao3 bu5 qi3");

    expect(result.map((item) => item.surfaceTone)).toEqual([3, 5, 3]);
    expect(result[1]?.appliedRules).not.toContain("bu-tone-sandhi");
  });

  it("preserves neutral tone 不 in 差不多", () => {
    const result = realize("差不多", "cha4 bu5 duo1");

    expect(result.map((item) => item.surfaceTone)).toEqual([4, 5, 1]);
    expect(result[1]?.appliedRules).not.toContain("bu-tone-sandhi");
  });

  it("applies 不 sandhi in 不客气", () => {
    const result = realize("不客气", "bu4 ke4 qi5");

    expect(result.map((item) => item.surfaceTone)).toEqual([2, 4, 5]);
    expect(result[0]?.appliedRules).toContain("bu-tone-sandhi");
  });

  it("does not mutate the original realizations", () => {
    const parsed = parsePinyin("bu4 shi4");

    if (!parsed.success) {
      throw new Error(parsed.error.message);
    }

    const original = preserveLexicalTones(parsed.syllables);

    applyBuToneSandhi("不是", original);

    expect(original.map((item) => item.surfaceTone)).toEqual([4, 4]);
  });
});
