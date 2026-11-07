import { describe, expect, it } from "vitest";
import { assessTone } from "./toneAssessment";
import type { PitchNormalizationResult } from "./pitchNormalization";

function createContour(
  values: number[],
  duration = 1,
): PitchNormalizationResult {
  return {
    points: values.map((normalizedPitch, index) => ({
      time: (index / (values.length - 1)) * duration,
      normalizedPitch,
      frequency: 100 + normalizedPitch * 100,
      clarity: 0.9,
    })),
    minFrequency: 100,
    maxFrequency: 200,
    duration,
  };
}

function createFlatContour(): PitchNormalizationResult {
  return createContour(Array(50).fill(0.5));
}

describe("assessTone", () => {
  it("recognizes the second tone", () => {
    const contour = createContour(
      Array.from({ length: 50 }, (_, index) => {
        return 0.15 + (index / 49) * 0.7;
      }),
    );

    const result = assessTone(contour);

    expect(result.status).toBe("matched");
    expect(result.matchedTone).toBe(2);
    expect(result.confidence).toBeGreaterThanOrEqual(90);
  });

  it("recognizes the third tone", () => {
    const contour = createContour(
      Array.from({ length: 50 }, (_, index) => {
        const position = index / 49;

        if (position < 0.45) {
          return 0.75 - (position / 0.45) * 0.6;
        }

        return 0.15 + ((position - 0.45) / 0.55) * 0.7;
      }),
    );

    const result = assessTone(contour);

    expect(result.status).toBe("matched");
    expect(result.matchedTone).toBe(3);
  });

  it("recognizes the fourth tone", () => {
    const contour = createContour(
      Array.from({ length: 50 }, (_, index) => {
        return 0.85 - (index / 49) * 0.7;
      }),
    );

    const result = assessTone(contour);

    expect(result.status).toBe("matched");
    expect(result.matchedTone).toBe(4);
  });

  it("returns an ambiguous result for a flat contour", () => {
    const result = assessTone(createFlatContour());

    expect(result.status).toBe("ambiguous");
    expect(result.matchedTone).toBeNull();

    expect(result.candidates.map((candidate) => candidate.tone)).toEqual([
      1, 5,
    ]);
  });

  it("returns insufficient-data for a short contour", () => {
    const result = assessTone(createContour([0.1, 0.5, 0.9]));

    expect(result.status).toBe("insufficient-data");
    expect(result.matchedTone).toBeNull();
  });

  it("returns insufficient-data for a very short recording", () => {
    const result = assessTone(createContour(Array(50).fill(0.5), 0.1));

    expect(result.status).toBe("insufficient-data");
  });

  it("does not confidently classify a contour that does not match a tone", () => {
    const contour = createContour(
      Array.from({ length: 50 }, (_, index) => {
        const position = index / 49;

        return position < 0.5 ? position * 2 : 1 - (position - 0.5) * 2;
      }),
    );

    const result = assessTone(contour);

    expect(result.matchedTone).toBeNull();
    expect(["uncertain", "ambiguous"]).toContain(result.status);
  });
});
