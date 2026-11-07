import { describe, expect, it } from "vitest";
import { normalizePitchContour } from "./pitchNormalization";
import type { PitchFrame } from "./pitchDetection";

function createFrames(frequencies: number[]): PitchFrame[] {
  return frequencies.map((frequency, index) => ({
    time: index * 0.1,
    frequency,
    clarity: 0.9,
  }));
}

describe("normalizePitchContour", () => {
  it("normalizes ascending pitch to a 0–1 range", () => {
    const result = normalizePitchContour(
      createFrames([100, 110, 120, 130, 140]),
    );

    expect(result.points.length).toBe(50);
    expect(result.points[0]!.normalizedPitch).toBe(0);
    expect(result.points[result.points.length - 1]!.normalizedPitch).toBe(1);
  });

  it("normalizes descending pitch", () => {
    const result = normalizePitchContour(
      createFrames([140, 130, 120, 110, 100]),
    );

    expect(result.points[0]!.normalizedPitch).toBe(1);
    expect(result.points[result.points.length - 1]!.normalizedPitch).toBe(0);
  });

  it("preserves the contour shape independently of absolute pitch", () => {
    const first = normalizePitchContour(
      createFrames([100, 110, 120, 130, 140]),
    );

    const second = normalizePitchContour(
      createFrames([200, 220, 240, 260, 280]),
    );

    expect(first.points.map((point) => point.normalizedPitch)).toEqual(
      second.points.map((point) => point.normalizedPitch),
    );
  });

  it("filters frames below the clarity threshold", () => {
    const frames: PitchFrame[] = [
      { time: 0, frequency: 100, clarity: 0.9 },
      { time: 0.1, frequency: 110, clarity: 0.2 },
      { time: 0.2, frequency: 120, clarity: 0.9 },
    ];

    const result = normalizePitchContour(frames);

    expect(result.minFrequency).toBe(100);
    expect(result.maxFrequency).toBe(120);
  });

  it("returns an empty result when there are not enough valid frames", () => {
    const result = normalizePitchContour([
      { time: 0, frequency: 100, clarity: 0.9 },
    ]);

    expect(result.points).toHaveLength(0);
  });

  it("handles constant pitch", () => {
    const result = normalizePitchContour(createFrames([120, 120, 120, 120]));

    expect(result.points).toHaveLength(50);

    for (const point of result.points) {
      expect(point.normalizedPitch).toBe(0.5);
    }
  });

  it("supports custom output point count", () => {
    const result = normalizePitchContour(createFrames([100, 110, 120]), {
      targetPointCount: 20,
    });

    expect(result.points).toHaveLength(20);
  });
});
