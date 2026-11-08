
import { describe, expect, it } from "vitest";
import {
  createAudioUrl,
  getHskAudioFilename,
  getSyllableAudioFilename,
} from "./audioManifest.mjs";

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

  it("normalizes ü notation", () => {
    expect(getSyllableAudioFilename("nü3")).toBe("cmn-nv3.mp3");
    expect(getSyllableAudioFilename("nu:3")).toBe("cmn-nv3.mp3");
  });

  it("rejects invalid syllables", () => {
    expect(() => getSyllableAudioFilename("ni")).toThrow();
    expect(() => getSyllableAudioFilename("ni6")).toThrow();
    expect(() => getSyllableAudioFilename("ni3 hao3")).toThrow();
  });
});

describe("createAudioUrl", () => {
  it("creates HSK audio URLs", () => {
    expect(createAudioUrl("hsk", "cmn-中国.mp3")).toBe(
      "/audio/hsk/cmn-中国.mp3",
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
