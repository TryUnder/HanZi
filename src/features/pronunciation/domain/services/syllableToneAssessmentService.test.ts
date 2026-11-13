import { describe, expect, it } from "vitest";
import { assessSyllableTone } from "./syllableToneAssessmentService";
import type { SyllablePitchContour } from "../models/syllablePitchContour";

function createContour(
  values: readonly number[],
  options: {
    durationSeconds?: number;
    voicedRatio?: number;
    clarity?: number;
    status?: "analyzed" | "insufficient-data";
  } = {},
): SyllablePitchContour {
  const durationSeconds = options.durationSeconds ?? 0.5;
  const clarity = options.clarity ?? 0.9;

  return {
    syllableIndex: 0,
    startSeconds: 0,
    endSeconds: durationSeconds,
    durationSeconds,
    status: options.status ?? "analyzed",
    points: values.map((semitonesFromReference, index) => ({
      timeSeconds: (index / (values.length - 1)) * durationSeconds,
      relativePosition: index / (values.length - 1),
      frequencyHz: 150 * Math.pow(2, semitonesFromReference / 12),
      semitonesFromReference,
      clarity,
    })),
    voicedFrameCount: values.length,
    availableFrameCount: values.length,
    voicedRatio: options.voicedRatio ?? 1,
    medianFrequencyHz: 150,
    minimumFrequencyHz: 130,
    maximumFrequencyHz: 180,
  };
}

function createLinearContour(start: number, end: number): SyllablePitchContour {
  return createContour(
    Array.from({ length: 20 }, (_, index) => {
      const ratio = index / 19;
      return start + (end - start) * ratio;
    }),
  );
}

describe("assessSyllableTone", () => {
  it("recognizes a stable first tone", () => {
    const result = assessSyllableTone(createContour(Array(20).fill(0)), 1);

    expect(result.status).toBe("matched");
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.feedbackCode).toBe("STABLE_CONTOUR");
  });

  it("recognizes a rising second tone", () => {
    const result = assessSyllableTone(createLinearContour(-1.5, 1.5), 2);

    expect(result.status).toBe("matched");
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.feedbackCode).toBe("RISING_CONTOUR");
  });

  it("recognizes a dipping third tone", () => {
    const values = [
      0, 0, 0, 0, 0, -0.5, -1, -1.5, -2, -2, -2, -2, -1.8, -1.5, -1.2, -1, -0.8,
      -0.6, -0.5, -0.4,
    ];

    const result = assessSyllableTone(createContour(values), 3);

    expect(result.status).toBe("matched");
    expect(result.feedbackCode).toBe("DIPPING_CONTOUR");
  });

  it("accepts a low falling third-tone realization", () => {
    const values = Array.from({ length: 20 }, (_, index) => {
      return -(index / 19) * 2;
    });

    const result = assessSyllableTone(createContour(values), 3);

    expect(result.feedbackCode).toBe("LOW_FALLING_CONTOUR");
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("recognizes a falling fourth tone", () => {
    const result = assessSyllableTone(createLinearContour(1.5, -1.5), 4);

    expect(result.status).toBe("matched");
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.feedbackCode).toBe("FALLING_CONTOUR");
  });

  it("does not grade neutral tone from pitch contour alone", () => {
    const result = assessSyllableTone(createContour(Array(20).fill(0)), 5);

    expect(result.status).toBe("limited-assessment");
    expect(result.score).toBeNull();
    expect(result.feedbackCode).toBe("NEUTRAL_TONE_LIMITATION");
  });

  it("returns insufficient data for an insufficient contour", () => {
    const result = assessSyllableTone(
      createContour([0, 1, 2], {
        status: "insufficient-data",
      }),
      2,
    );

    expect(result.status).toBe("insufficient-data");
    expect(result.score).toBeNull();
  });

  it("returns insufficient data for a short syllable", () => {
    const result = assessSyllableTone(
      createContour(Array(20).fill(0), {
        durationSeconds: 0.1,
      }),
      1,
    );

    expect(result.status).toBe("insufficient-data");
  });

  it("returns insufficient data when there are too few points", () => {
    const result = assessSyllableTone(createContour([0, 1, 2, 3, 4]), 2);

    expect(result.status).toBe("insufficient-data");
  });

  it("returns uncertain when confidence is too low", () => {
    const result = assessSyllableTone(
      createContour(
        Array.from({ length: 20 }, (_, index) => index * 0.1),
        {
          clarity: 0.1,
          voicedRatio: 0.1,
        },
      ),
      2,
    );

    expect(result.status).toBe("uncertain");
    expect(result.score).toBeNull();
    expect(result.feedbackCode).toBe("AMBIGUOUS_CONTOUR");
  });

  it("returns needs-improvement for a weak rising contour", () => {
    const result = assessSyllableTone(createLinearContour(0, 0.8), 2);

    expect(result.status).toBe("needs-improvement");
    expect(result.score).toBeGreaterThanOrEqual(45);
    expect(result.score).toBeLessThan(70);
  });

  it("rejects an invalid expected tone", () => {
    expect(() =>
      assessSyllableTone(createContour(Array(20).fill(0)), 6 as unknown as 1),
    ).toThrow("Invalid expected Mandarin tone.");
  });

  it("rejects invalid assessment options", () => {
    expect(() =>
      assessSyllableTone(createContour(Array(20).fill(0)), 1, {
        minimumPoints: 1,
      }),
    ).toThrow("Invalid syllable tone assessment configuration.");
  });
});
