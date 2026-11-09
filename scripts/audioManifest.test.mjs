import { describe, expect, it } from "vitest";
import {
  createAudioUrl,
  getHskAudioFilename,
  getSyllableAudioFilename,
  normalizePinyinSyllable,
} from "./audioManifest.mjs";

describe("normalizePinyinSyllable", () => {
  it("normalizes ü notation", () => {
    expect(normalizePinyinSyllable("nü3")).toBe("nv3");
    expect(normalizePinyinSyllable("nu:3")).toBe("nv3");
  });

  it("normalizes j, q, x and y aliases", () => {
    expect(normalizePinyinSyllable("jv4")).toBe("ju4");
    expect(normalizePinyinSyllable("qv4")).toBe("qu4");
    expect(normalizePinyinSyllable("xv4")).toBe("xu4");
    expect(normalizePinyinSyllable("yv4")).toBe("yu4");
  });

  it("preserves standard nv and lv notation", () => {
    expect(normalizePinyinSyllable("nv3")).toBe("nv3");
    expect(normalizePinyinSyllable("lv4")).toBe("lv4");
  });

  it("preserves neutral tone", () => {
    expect(normalizePinyinSyllable("ma5")).toBe("ma5");
  });

  it("normalizes whitespace and case", () => {
    expect(normalizePinyinSyllable(" NI3 ")).toBe("ni3");
  });

  it("rejects invalid syllables", () => {
    expect(() => normalizePinyinSyllable("ni")).toThrow();
    expect(() => normalizePinyinSyllable("ni6")).toThrow();
    expect(() => normalizePinyinSyllable("ni3 hao3")).toThrow();
    expect(() => normalizePinyinSyllable("")).toThrow();
    expect(() => normalizePinyinSyllable(null)).toThrow();
  });
});

describe("getHskAudioFilename", () => {
  it("creates filenames for single characters", () => {
    expect(getHskAudioFilename("你")).toBe("cmn-你.mp3");
  });

  it("creates filenames for multi-character words", () => {
    expect(getHskAudioFilename("中国")).toBe("cmn-中国.mp3");
  });

  it("rejects empty values", () => {
    expect(() => getHskAudioFilename("")).toThrow();
  });
});

describe("getSyllableAudioFilename", () => {
  it("creates filenames with numeric tones", () => {
    expect(getSyllableAudioFilename("ni3")).toBe("cmn-ni3.mp3");
  });

  it("supports all four lexical tones", () => {
    expect(getSyllableAudioFilename("ma1")).toBe("cmn-ma1.mp3");
    expect(getSyllableAudioFilename("ma2")).toBe("cmn-ma2.mp3");
    expect(getSyllableAudioFilename("ma3")).toBe("cmn-ma3.mp3");
    expect(getSyllableAudioFilename("ma4")).toBe("cmn-ma4.mp3");
  });

  it("supports neutral tone", () => {
    expect(getSyllableAudioFilename("ma5")).toBe("cmn-ma5.mp3");
  });

  it("normalizes ü notation", () => {
    expect(getSyllableAudioFilename("nü3")).toBe("cmn-nv3.mp3");
    expect(getSyllableAudioFilename("nu:3")).toBe("cmn-nv3.mp3");
  });

  it("normalizes j, q, x and y aliases", () => {
    expect(getSyllableAudioFilename("jv4")).toBe("cmn-ju4.mp3");
    expect(getSyllableAudioFilename("qv4")).toBe("cmn-qu4.mp3");
    expect(getSyllableAudioFilename("xv4")).toBe("cmn-xu4.mp3");
    expect(getSyllableAudioFilename("yv4")).toBe("cmn-yu4.mp3");
  });
});

describe("createAudioUrl", () => {
  it("creates HSK audio URLs", () => {
    expect(createAudioUrl("hsk", "cmn-中国.mp3")).toBe(
      "/audio/hsk/cmn-%E4%B8%AD%E5%9B%BD.mp3",
    );
  });

  it("creates syllable audio URLs", () => {
    expect(createAudioUrl("syllables", "cmn-ni3.mp3")).toBe(
      "/audio/syllables/cmn-ni3.mp3",
    );
  });

  it("rejects unsupported categories", () => {
    expect(() => createAudioUrl("characters", "ni.mp3")).toThrow();
  });

  it("rejects path traversal", () => {
    expect(() => createAudioUrl("hsk", "../ni.mp3")).toThrow();
  });
});
