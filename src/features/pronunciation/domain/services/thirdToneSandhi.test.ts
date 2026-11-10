import { describe, expect, it } from "vitest";

import { parsePinyin } from "./pinyinParser";
import { preserveLexicalTones } from "./toneRealizationService";
import { applyThirdToneSandhi } from "./thirdToneSandhi";

function realize(pinyin: string) {
  const parsed = parsePinyin(pinyin);

  if (!parsed.success) {
    throw new Error(parsed.error.message);
  }

  return applyThirdToneSandhi(preserveLexicalTones(parsed.syllables));
}

describe("applyThirdToneSandhi", () => {
  it("changes the first tone in a sequence of two third tones", () => {
    const result = realize("ni3 hao3");

    expect(result.map((item) => item.surfaceTone)).toEqual([2, 3]);
  });

  it("changes all but the final tone in a sequence of three third tones", () => {
    const result = realize("wo3 hen3 hao3");

    expect(result.map((item) => item.surfaceTone)).toEqual([2, 2, 3]);
  });

  it("does not change a third tone before a non-third tone", () => {
    const result = realize("ni3 hao3 ma5");

    expect(result.map((item) => item.surfaceTone)).toEqual([2, 3, 5]);
  });

  it("does not change isolated third tones", () => {
    const result = realize("ni3 hao3 ma1");

    expect(result.map((item) => item.surfaceTone)).toEqual([2, 3, 1]);
  });

  it("preserves lexical tones after applying sandhi", () => {
    const result = realize("ni3 hao3");

    expect(result.map((item) => item.syllable.lexicalTone)).toEqual([3, 3]);
    expect(result.map((item) => item.surfaceTone)).toEqual([2, 3]);
  });

  it("records which syllables were affected by the rule", () => {
    const result = realize("ni3 hao3");

    expect(result[0]?.appliedRules).toContain("third-tone-sandhi");
    expect(result[1]?.appliedRules).toEqual([]);
  });

  it("does not mutate the original realizations", () => {
    const parsed = parsePinyin("ni3 hao3");

    if (!parsed.success) {
      throw new Error(parsed.error.message);
    }

    const original = preserveLexicalTones(parsed.syllables);

    applyThirdToneSandhi(original);

    expect(original.map((item) => item.surfaceTone)).toEqual([3, 3]);
  });

  it("does not modify realizations when no third-tone sequence exists", () => {
    const result = realize("ni2 hao3 ma1");

    expect(result.map((item) => item.surfaceTone)).toEqual([2, 3, 1]);
    expect(result.every((item) => item.appliedRules.length === 0)).toBe(true);
  });
});
