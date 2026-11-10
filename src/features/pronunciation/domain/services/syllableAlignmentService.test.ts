import { describe, expect, it } from "vitest";

import type {
  ForcedAlignmentResult,
  FramePhoneAlignment,
} from "../models/forcedAlignment";
import type { PhonemizedPronunciation, TargetPhoneme } from "../models/phoneme";
import { mapAlignmentToSyllables } from "./syllableAlignmentService";

function createPhoneme(
  symbol: string,
  vocabularyId: number,
  syllableIndex: number,
  positionInSyllable: number,
): TargetPhoneme {
  return {
    symbol,
    vocabularyId,
    syllableIndex,
    positionInSyllable,
  };
}

function createPronunciation(): PhonemizedPronunciation {
  const phonemes = [
    createPhoneme("n", 10, 0, 0),
    createPhoneme("i3", 11, 0, 1),
    createPhoneme("h", 12, 1, 0),
    createPhoneme("ao3", 13, 1, 1),
  ];

  return {
    syllables: 2,
    phonemes,
    phoneIds: phonemes.map((phoneme) => phoneme.vocabularyId),
  };
}

function createFrame(
  frameIndex: number,
  targetPhoneIndex: number | null,
  confidence = 0.9,
  isSilence = false,
): FramePhoneAlignment {
  return {
    frameIndex,
    timeSeconds: frameIndex * 0.01,
    targetPhoneIndex,
    confidence,
    isSilence,
  };
}

function createForcedAlignment(
  frames: readonly FramePhoneAlignment[],
): ForcedAlignmentResult {
  return {
    durationSeconds: frames.length * 0.01,
    frameDurationSeconds: 0.01,
    frames,
    speechFrameCount: frames.filter((frame) => !frame.isSilence).length,
    alignedFrameCount: frames.filter((frame) => frame.targetPhoneIndex !== null)
      .length,
  };
}

describe("mapAlignmentToSyllables", () => {
  it("maps aligned phone frames to the correct syllables", () => {
    const frames = [
      createFrame(0, 0),
      createFrame(1, 0),
      createFrame(2, 1),
      createFrame(3, 1),
      createFrame(4, 2),
      createFrame(5, 2),
      createFrame(6, 3),
      createFrame(7, 3),
    ];

    const result = mapAlignmentToSyllables(
      createForcedAlignment(frames),
      createPronunciation(),
    );

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.alignment.status).toBe("aligned");
    expect(result.alignment.syllables).toHaveLength(2);

    expect(result.alignment.syllables[0]).toMatchObject({
      syllableIndex: 0,
      startSeconds: 0,
      endSeconds: 0.04,
      durationSeconds: 0.04,
      alignedFrames: 4,
      confidence: 0.9,
    });

    expect(result.alignment.syllables[1]).toMatchObject({
      syllableIndex: 1,
      startSeconds: 0.04,
      endSeconds: 0.08,
      durationSeconds: 0.04,
      alignedFrames: 4,
      confidence: 0.9,
    });

    expect(result.alignment.syllables[0]?.finalAlignment).toMatchObject({
    startSeconds: 0.02,
    endSeconds: 0.04,
    alignedFrames: 2,
    firstPhoneIndex: 1,
    lastPhoneIndex: 1,
    });

    expect(result.alignment.syllables[1]?.finalAlignment).toMatchObject({
    startSeconds: 0.06,
    endSeconds: 0.08,
    alignedFrames: 2,
    firstPhoneIndex: 3,
    lastPhoneIndex: 3,
    });
  });

  it("preserves separate adjacent phones with the same symbol", () => {
    const phonemes = [
      createPhoneme("a1", 20, 0, 0),
      createPhoneme("a1", 21, 1, 0),
    ];

    const pronunciation: PhonemizedPronunciation = {
      syllables: 2,
      phonemes,
      phoneIds: [20, 21],
    };

    const frames = [
      createFrame(0, 0),
      createFrame(1, 0),
      createFrame(2, 1),
      createFrame(3, 1),
    ];

    const result = mapAlignmentToSyllables(
      createForcedAlignment(frames),
      pronunciation,
    );

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.alignment.syllables[0]?.alignedFrames).toBe(2);
    expect(result.alignment.syllables[1]?.alignedFrames).toBe(2);
  });

  it("returns insufficient-data when a syllable has too few frames", () => {
    const frames = [
      createFrame(0, 0),
      createFrame(1, 2),
      createFrame(2, 3),
      createFrame(3, 3),
      createFrame(4, 3),
    ];

    const result = mapAlignmentToSyllables(
      createForcedAlignment(frames),
      createPronunciation(),
    );

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.alignment.status).toBe("insufficient-data");
    expect(result.alignment.syllables[0]?.alignedFrames).toBe(1);
    expect(result.alignment.syllables[1]?.alignedFrames).toBe(4);
  });

  it("returns MISSING_SYLLABLE when a syllable has no aligned frames", () => {
    const frames = [
      createFrame(0, 0),
      createFrame(1, 0),
      createFrame(2, 1),
      createFrame(3, 1),
    ];

    const result = mapAlignmentToSyllables(
      createForcedAlignment(frames),
      createPronunciation(),
    );

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "MISSING_SYLLABLE",
      },
    });
  });

  it("ignores silence frames", () => {
    const frames = [
      createFrame(0, null, 0, true),
      createFrame(1, 0),
      createFrame(2, 0),
      createFrame(3, 1),
      createFrame(4, 1),
      createFrame(5, 2),
      createFrame(6, 2),
      createFrame(7, 3),
      createFrame(8, 3),
      createFrame(9, null, 0, true),
    ];

    const result = mapAlignmentToSyllables(
      createForcedAlignment(frames),
      createPronunciation(),
    );

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.alignment.syllables[0]?.startSeconds).toBe(0.01);
    expect(result.alignment.syllables[1]?.endSeconds).toBe(0.09);
  });

  it("rejects empty pronunciation data", () => {
    const result = mapAlignmentToSyllables(
      createForcedAlignment([createFrame(0, 0)]),
      {
        syllables: 0,
        phonemes: [],
        phoneIds: [],
      },
    );

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "EMPTY_ALIGNMENT",
      },
    });
  });

  it("rejects mismatched phone metadata", () => {
    const pronunciation = createPronunciation();

    const result = mapAlignmentToSyllables(
      createForcedAlignment([createFrame(0, 0), createFrame(1, 1)]),
      {
        ...pronunciation,
        phoneIds: [99, 98, 97, 96],
      },
    );

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "INVALID_PHONE_REFERENCE",
      },
    });
  });

  it("rejects an out-of-range phone index", () => {
    const result = mapAlignmentToSyllables(
      createForcedAlignment([createFrame(0, 99), createFrame(1, 99)]),
      createPronunciation(),
    );

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "INVALID_PHONE_REFERENCE",
      },
    });
  });

  it("rejects an invalid minimum frame count", () => {
    const result = mapAlignmentToSyllables(
      createForcedAlignment([
        createFrame(0, 0),
        createFrame(1, 1),
        createFrame(2, 2),
        createFrame(3, 3),
      ]),
      createPronunciation(),
      { minimumFramesPerSyllable: 0 },
    );

    expect(result).toMatchObject({
      success: false,
      error: {
        code: "INVALID_TIMELINE",
      },
    });
  });

  it("allows a custom minimum frame count", () => {
    const frames = [
      createFrame(0, 0),
      createFrame(1, 1),
      createFrame(2, 2),
      createFrame(3, 3),
    ];

    const result = mapAlignmentToSyllables(
      createForcedAlignment(frames),
      createPronunciation(),
      { minimumFramesPerSyllable: 1 },
    );

    expect(result.success).toBe(true);

    if (!result.success) return;

    expect(result.alignment.status).toBe("aligned");
  });
});
