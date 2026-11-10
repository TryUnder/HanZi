import { describe, expect, it } from "vitest";
import { analyzeSyllablePitch } from "./syllablePitchAnalysisService";
import type { PitchFrame } from "../models/pitchFrame";
import type { SyllableAlignment } from "../models/syllableAlignment";

const FRAME_WINDOW = 0.02;


function createAlignment(
  syllableIndex: number,
  startSeconds: number,
  endSeconds: number,
): SyllableAlignment {
  return {
    syllableIndex,
    startSeconds,
    endSeconds,
    durationSeconds: endSeconds - startSeconds,
    confidence: 0.9,
    alignedFrames: 40,
    finalAlignment: {
      startSeconds,
      endSeconds,
      durationSeconds: endSeconds - startSeconds,
      confidence: 0.9,
      alignedFrames: 40,
      firstPhoneIndex: 0,
      lastPhoneIndex: 1,
    },
  };
}


function createFrames(
  startSeconds: number,
  endSeconds: number,
  frequencyHz: number,
  clarity = 0.9,
): PitchFrame[] {
  const frames: PitchFrame[] = [];

  for (
    let timeSeconds = startSeconds;
    timeSeconds <= endSeconds + 0.000001;
    timeSeconds += 0.02
  ) {
    frames.push({
      timeSeconds: Number(timeSeconds.toFixed(6)),
      frequencyHz,
      clarity,
    });
  }

  return frames;
}

function analyze(
  frames: readonly PitchFrame[],
  alignments: readonly SyllableAlignment[],
) {
  return analyzeSyllablePitch(frames, alignments, {
    frameWindowDurationSeconds: FRAME_WINDOW,
    minimumFrames: 5,
    minimumClarity: 0.35,
    minimumVoicedRatio: 0.35,
  });
}

describe("analyzeSyllablePitch", () => {
  it("extracts a pitch contour for an aligned syllable", () => {
    const frames = createFrames(0.02, 0.48, 150);
    const result = analyze(
      frames,
      [createAlignment(0, 0, 0.5)],
    );

    expect(result.status).toBe("analyzed");
    expect(result.referenceFrequencyHz).toBeCloseTo(150);

    const syllable = result.syllables[0]!;

    expect(syllable.status).toBe("analyzed");
    expect(syllable.points.length).toBeGreaterThanOrEqual(5);
    expect(syllable.medianFrequencyHz).toBeCloseTo(150);
    expect(syllable.voicedRatio).toBe(1);
  });

  it("uses one shared reference frequency across all syllables", () => {
    const frames = [
      ...createFrames(0.02, 0.48, 100),
      ...createFrames(0.52, 0.98, 200),
    ];

    const result = analyze(frames, [
      createAlignment(0, 0, 0.5),
      createAlignment(1, 0.5, 1),
    ]);

    expect(result.status).toBe("analyzed");
    expect(result.referenceFrequencyHz).toBeCloseTo(150);

    const first = result.syllables[0]!;
    const second = result.syllables[1]!;

    expect(first.points[0]!.semitonesFromReference).toBeCloseTo(
      12 * Math.log2(100 / 150),
    );

    expect(second.points[0]!.semitonesFromReference).toBeCloseTo(
      12 * Math.log2(200 / 150),
    );

    expect(
      second.points[0]!.semitonesFromReference,
    ).toBeGreaterThan(first.points[0]!.semitonesFromReference);
  });

  it("excludes frames whose analysis windows cross syllable boundaries", () => {
    const frames: PitchFrame[] = [
      { timeSeconds: 0.005, frequencyHz: 150, clarity: 0.9 },
      ...createFrames(0.02, 0.48, 150),
      { timeSeconds: 0.495, frequencyHz: 150, clarity: 0.9 },
    ];

    const result = analyze(
      frames,
      [createAlignment(0, 0, 0.5)],
    );

    const syllable = result.syllables[0]!;

    expect(syllable.points.every(
      (point) =>
        point.timeSeconds - FRAME_WINDOW / 2 >= 0 &&
        point.timeSeconds + FRAME_WINDOW / 2 <= 0.5,
    )).toBe(true);

    expect(syllable.points).toHaveLength(24);
  });

  it("returns insufficient data when too few voiced frames are available", () => {
    const frames = createFrames(0.02, 0.48, 150).slice(0, 3);

    const result = analyze(
      frames,
      [createAlignment(0, 0, 0.5)],
    );

    expect(result.status).toBe("insufficient-data");
    expect(result.syllables[0]!.status).toBe("insufficient-data");
    expect(result.syllables[0]!.points).toHaveLength(0);
  });

  it("ignores frames below the clarity threshold", () => {
    const frames = createFrames(0.02, 0.48, 150, 0.2);

    const result = analyze(
      frames,
      [createAlignment(0, 0, 0.5)],
    );

    expect(result.status).toBe("insufficient-data");
    expect(result.syllables[0]!.voicedFrameCount).toBe(0);
  });

  it("returns insufficient data when a word has no voiced frames", () => {
    const frames = createFrames(0.02, 0.48, 150, 0);

    const result = analyze(
      frames,
      [createAlignment(0, 0, 0.5)],
    );

    expect(result.referenceFrequencyHz).toBeNull();
    expect(result.status).toBe("insufficient-data");
  });

  it("rejects an empty alignment list", () => {
    expect(() =>
      analyzeSyllablePitch([], []),
    ).toThrow("At least one syllable alignment is required.");
  });

  it("rejects invalid pitch frames", () => {
    const frames: PitchFrame[] = [
      {
        timeSeconds: 0.1,
        frequencyHz: 150,
        clarity: 1.5,
      },
    ];

    expect(() =>
      analyze(
        frames,
        [createAlignment(0, 0, 0.5)],
      ),
    ).toThrow("Invalid pitch frame.");
  });

  it("rejects invalid syllable alignments", () => {
    const invalidAlignment = {
      ...createAlignment(0, 0, 0.5),
      endSeconds: 0,
    };

    expect(() =>
      analyze([], [invalidAlignment]),
    ).toThrow("Invalid syllable alignment.");
  });

  it("rejects unordered syllable alignments", () => {
    const alignments = [
      createAlignment(1, 0.5, 1),
      createAlignment(0, 0, 0.5),
    ];

    expect(() =>
      analyze([], alignments),
    ).toThrow("Syllable alignments must be ordered.");
  });


it("uses only the final interval and excludes the initial consonant", () => {
  const frames = [
    ...createFrames(0.02, 0.18, 100),
    ...createFrames(0.22, 0.48, 200),
  ];

  const alignment: SyllableAlignment = {
    ...createAlignment(0, 0, 0.5),
    finalAlignment: {
      startSeconds: 0.2,
      endSeconds: 0.5,
      durationSeconds: 0.3,
      confidence: 0.9,
      alignedFrames: 30,
      firstPhoneIndex: 1,
      lastPhoneIndex: 1,
    },
  };

  const result = analyze(frames, [alignment]);

  expect(result.status).toBe("analyzed");
  expect(result.referenceFrequencyHz).toBeCloseTo(200);

  const syllable = result.syllables[0]!;

  expect(syllable.startSeconds).toBe(0.2);
  expect(syllable.endSeconds).toBe(0.5);
  expect(syllable.medianFrequencyHz).toBeCloseTo(200);

  expect(
    syllable.points.every(
      (point) => point.timeSeconds >= 0.2,
    ),
  ).toBe(true);
});

});
