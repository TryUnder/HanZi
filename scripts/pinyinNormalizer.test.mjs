import { describe, expect, it } from "vitest";
import { normalizePinyin } from "./pinyinNormalizer.mjs";

describe("normalizePinyin", () => {
  it("converts uppercase letters to lowercase", () => {
    expect(normalizePinyin("Yi3")).toBe("yi3");
  });

  it("preserves tone numbers", () => {
    expect(normalizePinyin("ma1 ma2 ma3 ma4 ma5")).toBe("ma1 ma2 ma3 ma4 ma5");
  });

  it("normalizes v notation to ü", () => {
    expect(normalizePinyin("lv4")).toBe("lü4");
  });

  it("normalizes u-colon notation to ü", () => {
    expect(normalizePinyin("lu:4")).toBe("lü4");
  });

  it("treats equivalent ü notations identically", () => {
    const variants = ["lü4", "lv4", "lu:4"];

    expect(new Set(variants.map(normalizePinyin)).size).toBe(1);
  });

  it("normalizes whitespace", () => {
    expect(normalizePinyin("  ni3   hao3  ")).toBe("ni3 hao3");
  });

  it("normalizes Unicode to NFC", () => {
    expect(normalizePinyin("lü4")).toBe(normalizePinyin("lu\u03084"));
  });

  it("preserves different syllables and tones", () => {
    expect(normalizePinyin("su4")).not.toBe(normalizePinyin("xiu3"));
    expect(normalizePinyin("ma1")).not.toBe(normalizePinyin("ma2"));
  });

  it("returns an empty string for empty input", () => {
    expect(normalizePinyin("   ")).toBe("");
  });

  it("rejects non-string input", () => {
    expect(() => normalizePinyin(123)).toThrow(TypeError);
  });
});
