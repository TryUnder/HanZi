import { describe, expect, it } from "vitest";
import { parsePinyin } from "./pinyinParser";

describe("parsePinyin", () => {
  it("parses a two-syllable word", () => {
    const result = parsePinyin("ni3 hao3");

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.syllables).toEqual([
      {
        pinyin: "ni",
        lexicalTone: 3,
        isNeutralTone: false,
        erhua: false,
      },
      {
        pinyin: "hao",
        lexicalTone: 3,
        isNeutralTone: false,
        erhua: false,
      },
    ]);
  });

  it("recognizes neutral tone", () => {
    const result = parsePinyin("ming2 zi5");

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.syllables[1]).toMatchObject({
      pinyin: "zi",
      lexicalTone: 5,
      isNeutralTone: true,
      erhua: false,
    });
  });

  it("attaches erhua to the preceding syllable", () => {
    const result = parsePinyin("yi1 hui4 r5");

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.syllables).toHaveLength(2);

    expect(result.syllables[1]).toMatchObject({
      pinyin: "hui",
      lexicalTone: 4,
      isNeutralTone: false,
      erhua: true,
    });
  });

  it("normalizes u: and v to ü", () => {
    const result = parsePinyin("lü4 nv3");

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.syllables.map((item) => item.pinyin)).toEqual(["lü", "nü"]);
  });

  it("rejects empty input", () => {
    const result = parsePinyin("   ");

    expect(result.success).toBe(false);

    if (result.success) return;

    expect(result.error.code).toBe("EMPTY_INPUT");
  });

  it("rejects malformed tokens", () => {
    const result = parsePinyin("ni hao3");

    expect(result.success).toBe(false);

    if (result.success) return;

    expect(result.error.code).toBe("INVALID_TOKEN");
    expect(result.error.token).toBe("ni");
  });

  it("rejects erhua without a preceding syllable", () => {
    const result = parsePinyin("r5");

    expect(result.success).toBe(false);

    if (result.success) return;

    expect(result.error.code).toBe("INVALID_ERHUA_POSITION");
  });
});
