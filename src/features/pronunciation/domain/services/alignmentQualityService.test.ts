import { describe, expect, it } from "vitest";

import type { PhonemizedPronunciation } from "../models/phoneme";
import type { ForcedAlignmentResult } from "../models/forcedAlignment";
import type { PronunciationAlignment } from "../models/syllableAlignment";

import { evaluateAlignmentQuality } from "./alignmentQualityService";

function createPronunciation(): PhonemizedPronunciation {
  return {
    syllables: 2,
    phonemes: [
      {
        symbol: "n",
        vocabularyId: 124,
        syllableIndex: 0,
        positionInSyllable: 0,
      },
      {
        symbol: "i3",
        vocabularyId: 62,
        syllableIndex: 0,
        positionInSyllable: 1,
      },
      {
        symbol: "h",
        vocabularyId: 59,
        syllableIndex: 1,
        positionInSyllable: 0,
      },
      {
        symbol: "ao3",
        vocabularyId: 25,
        syllableIndex: 1,
        positionInSyllable: 1,
      },
    ],
    phoneIds: [124, 62, 59, 25],
  };
}

function createForcedAlignment(
  targetPhoneIndexes: readonly number[],
  confidence = 0.5,
): ForcedAlignmentResult {
  const frames = targetPhoneIndexes.map((targetPhoneIndex, frameIndex) => ({
    frameIndex,
    timeSeconds: frameIndex * 0.01,
    targetPhoneIndex,
    confidence,
    isSilence: false,
  }));

  return {
    durationSeconds: frames.length * 0.01,
    frameDurationSeconds: 0.01,
    frames,
    speechFrameCount: frames.length,
    alignedFrameCount: frames.length,
  };
}

function createSyllableAlignment(
  firstSyllable: {
    readonly durationSeconds: number;
    readonly alignedFrames: number;
    readonly confidence: number;
  },
  secondSyllable: {
    readonly durationSeconds: number;
    readonly alignedFrames: number;
    readonly confidence: number;
  },
): PronunciationAlignment {
  const syllables = [firstSyllable, secondSyllable].map(
    (syllable, syllableIndex) => {
      const startSeconds =
        syllableIndex === 0 ? 0 : firstSyllable.durationSeconds;

      const endSeconds = startSeconds + syllable.durationSeconds;

      return {
        syllableIndex,
        startSeconds,
        endSeconds,
        durationSeconds: syllable.durationSeconds,
        confidence: syllable.confidence,
        alignedFrames: syllable.alignedFrames,
        finalAlignment: {
          startSeconds,
          endSeconds,
          durationSeconds: syllable.durationSeconds,
          confidence: syllable.confidence,
          alignedFrames: syllable.alignedFrames,
          firstPhoneIndex: syllableIndex === 0 ? 1 : 3,
          lastPhoneIndex: syllableIndex === 0 ? 1 : 3,
        },
      };
    },
  );

  return {
    status: "aligned",
    durationSeconds: syllables.reduce(
      (sum, syllable) => sum + syllable.durationSeconds,
      0,
    ),
    syllables,
    averageConfidence:
      (firstSyllable.confidence + secondSyllable.confidence) / 2,
    alignedFrameCount:
      firstSyllable.alignedFrames + secondSyllable.alignedFrames,
    speechFrameCount:
      firstSyllable.alignedFrames + secondSyllable.alignedFrames,
  };
}

describe("evaluateAlignmentQuality", () => {
  it("accepts a well-aligned two-syllable pronunciation", () => {
    const pronunciation = createPronunciation();

    const forcedAlignment = createForcedAlignment([
      ...Array(10).fill(0),
      ...Array(10).fill(1),
      ...Array(10).fill(2),
      ...Array(10).fill(3),
    ]);

    const syllableAlignment = createSyllableAlignment(
      {
        durationSeconds: 0.2,
        alignedFrames: 20,
        confidence: 0.5,
      },
      {
        durationSeconds: 0.2,
        alignedFrames: 20,
        confidence: 0.5,
      },
    );

    const result = evaluateAlignmentQuality(
      forcedAlignment,
      pronunciation,
      syllableAlignment,
    );

    expect(result.status).toBe("accepted");
    expect(result.phonemes).toHaveLength(4);
    expect(result.syllables).toHaveLength(2);
    expect(result.issues).toHaveLength(0);
    expect(result.averageConfidence).toBeCloseTo(0.5);
  });

  it("rejects an alignment with an extremely uneven frame distribution", () => {
    const pronunciation = createPronunciation();

    const forcedAlignment = createForcedAlignment([
      ...Array(19).fill(0),
      ...Array(19).fill(1),
      ...Array(4).fill(2),
      ...Array(4).fill(3),
    ]);

    const syllableAlignment = createSyllableAlignment(
      {
        durationSeconds: 0.38,
        alignedFrames: 38,
        confidence: 0.5,
      },
      {
        durationSeconds: 0.08,
        alignedFrames: 8,
        confidence: 0.5,
      },
    );

    const result = evaluateAlignmentQuality(
      forcedAlignment,
      pronunciation,
      syllableAlignment,
      {
        maximumSyllableFrameShare: 0.75,
      },
    );

    expect(result.status).toBe("rejected");

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "EXTREME_FRAME_DISTRIBUTION",
          severity: "error",
          syllableIndex: 0,
        }),
      ]),
    );
  });

  it("returns insufficient-data when a phoneme has no aligned frames", () => {
    const pronunciation = createPronunciation();

    const forcedAlignment = createForcedAlignment([
      ...Array(20).fill(0),
      ...Array(10).fill(2),
      ...Array(10).fill(3),
    ]);

    const syllableAlignment = createSyllableAlignment(
      {
        durationSeconds: 0.2,
        alignedFrames: 20,
        confidence: 0.5,
      },
      {
        durationSeconds: 0.2,
        alignedFrames: 20,
        confidence: 0.5,
      },
    );

    const result = evaluateAlignmentQuality(
      forcedAlignment,
      pronunciation,
      syllableAlignment,
    );

    expect(result.status).toBe("insufficient-data");

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_PHONEME_FRAMES",
          phonemeIndex: 1,
        }),
      ]),
    );
  });

  it("returns low-confidence when alignment confidence is too low", () => {
    const pronunciation = createPronunciation();

    const forcedAlignment = createForcedAlignment(
      [
        ...Array(10).fill(0),
        ...Array(10).fill(1),
        ...Array(10).fill(2),
        ...Array(10).fill(3),
      ],
      0.02,
    );

    const syllableAlignment = createSyllableAlignment(
      {
        durationSeconds: 0.2,
        alignedFrames: 20,
        confidence: 0.02,
      },
      {
        durationSeconds: 0.2,
        alignedFrames: 20,
        confidence: 0.02,
      },
    );

    const result = evaluateAlignmentQuality(
      forcedAlignment,
      pronunciation,
      syllableAlignment,
    );

    expect(result.status).toBe("low-confidence");

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "LOW_PHONEME_CONFIDENCE",
        }),
        expect.objectContaining({
          code: "LOW_SYLLABLE_CONFIDENCE",
        }),
      ]),
    );
  });

  it("rejects a syllable with an implausibly short duration", () => {
    const pronunciation = createPronunciation();

    const forcedAlignment = createForcedAlignment([
      ...Array(20).fill(0),
      ...Array(20).fill(1),
      ...Array(2).fill(2),
      ...Array(2).fill(3),
    ]);

    const syllableAlignment = createSyllableAlignment(
      {
        durationSeconds: 0.2,
        alignedFrames: 40,
        confidence: 0.5,
      },
      {
        durationSeconds: 0.02,
        alignedFrames: 4,
        confidence: 0.5,
      },
    );

    const result = evaluateAlignmentQuality(
      forcedAlignment,
      pronunciation,
      syllableAlignment,
    );

    expect(result.status).toBe("rejected");

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SYLLABLE_TOO_SHORT",
          severity: "error",
          syllableIndex: 1,
        }),
      ]),
    );
  });

  it("rejects invalid quality thresholds", () => {
    const pronunciation = createPronunciation();

    const forcedAlignment = createForcedAlignment([
      ...Array(10).fill(0),
      ...Array(10).fill(1),
      ...Array(10).fill(2),
      ...Array(10).fill(3),
    ]);

    const syllableAlignment = createSyllableAlignment(
      {
        durationSeconds: 0.2,
        alignedFrames: 20,
        confidence: 0.5,
      },
      {
        durationSeconds: 0.2,
        alignedFrames: 20,
        confidence: 0.5,
      },
    );

    expect(() =>
      evaluateAlignmentQuality(
        forcedAlignment,
        pronunciation,
        syllableAlignment,
        {
          minimumPhonemeConfidence: 1.5,
        },
      ),
    ).toThrow("Invalid alignment quality options.");
  });
});
