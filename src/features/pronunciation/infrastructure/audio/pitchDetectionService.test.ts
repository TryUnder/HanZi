
import { describe, expect, it } from "vitest";

import { detectPitch } from "./pitchDetectionService";

const SAMPLE_RATE = 16000;
const DURATION_SECONDS = 0.5;

function createSineWave(
  frequencyHz: number,
  durationSeconds = DURATION_SECONDS,
  amplitude = 1,
): Float32Array {
  const samples = new Float32Array(
    Math.floor(SAMPLE_RATE * durationSeconds),
  );

  for (let index = 0; index < samples.length; index += 1) {
    samples[index] =
      amplitude *
      Math.sin(
        (2 * Math.PI * frequencyHz * index) / SAMPLE_RATE,
      );
  }

  return samples;
}

function createHarmonicSignal(
  fundamentalHz: number,
  durationSeconds = DURATION_SECONDS,
): Float32Array {
  const samples = new Float32Array(
    Math.floor(SAMPLE_RATE * durationSeconds),
  );

  for (let index = 0; index < samples.length; index += 1) {
    const time = index / SAMPLE_RATE;

    samples[index] =
      0.4 * Math.sin(2 * Math.PI * fundamentalHz * time) +
      0.8 * Math.sin(2 * Math.PI * fundamentalHz * 2 * time);
  }

  return samples;
}

function createPitchGlide(
  startFrequencyHz: number,
  endFrequencyHz: number,
  durationSeconds = DURATION_SECONDS,
): Float32Array {
  const samples = new Float32Array(
    Math.floor(SAMPLE_RATE * durationSeconds),
  );

  let phase = 0;

  for (let index = 0; index < samples.length; index += 1) {
    const progress = index / samples.length;

    const frequency =
      startFrequencyHz +
      (endFrequencyHz - startFrequencyHz) * progress;

    samples[index] = Math.sin(phase);

    phase += (2 * Math.PI * frequency) / SAMPLE_RATE;
  }

  return samples;
}

function calculateMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1]! + sorted[middle]!) / 2;
  }

  return sorted[middle]!;
}

describe("detectPitch", () => {
  it.each([85, 100, 120, 150, 200, 300])(
    "detects a sine wave at %i Hz",
    (frequencyHz) => {
      const frames = detectPitch(
        createSineWave(frequencyHz),
        SAMPLE_RATE,
      );

      const detectedFrames = frames.filter(
        (frame) => frame.frequencyHz !== null,
      );

      expect(detectedFrames.length).toBeGreaterThan(0);

      const averageFrequency =
        detectedFrames.reduce(
          (sum, frame) => sum + frame.frequencyHz!,
          0,
        ) / detectedFrames.length;

      expect(averageFrequency).toBeCloseTo(frequencyHz, -1);
    },
  );

  it("detects a quiet voiced signal", () => {
    const frames = detectPitch(
      createSineWave(150, DURATION_SECONDS, 0.01),
      SAMPLE_RATE,
    );

    const detectedFrames = frames.filter(
      (frame) => frame.frequencyHz !== null,
    );

    expect(detectedFrames.length).toBeGreaterThan(0);

    const medianFrequency = calculateMedian(
      detectedFrames.map((frame) => frame.frequencyHz!),
    );

    expect(medianFrequency).toBeCloseTo(150, -1);
  });

  it("detects the fundamental frequency when the second harmonic is stronger", () => {
    const frames = detectPitch(
      createHarmonicSignal(100),
      SAMPLE_RATE,
    );

    const detectedFrames = frames.filter(
      (frame) => frame.frequencyHz !== null,
    );

    expect(detectedFrames.length).toBeGreaterThan(0);

    const medianFrequency = calculateMedian(
      detectedFrames.map((frame) => frame.frequencyHz!),
    );

    expect(medianFrequency).toBeCloseTo(100, -1);
  });

  it("tracks a gradual pitch glide without excessive missing frames", () => {
    const frames = detectPitch(
      createPitchGlide(120, 180),
      SAMPLE_RATE,
    );

    const detectedFrames = frames.filter(
      (frame) => frame.frequencyHz !== null,
    );

    expect(detectedFrames.length).toBeGreaterThan(
      frames.length * 0.8,
    );

    const medianFrequency = calculateMedian(
      detectedFrames.map((frame) => frame.frequencyHz!),
    );

    expect(medianFrequency).toBeGreaterThan(130);
    expect(medianFrequency).toBeLessThan(170);

    for (
      let index = 1;
      index < detectedFrames.length;
      index += 1
    ) {
      const previous = detectedFrames[index - 1]!.frequencyHz!;
      const current = detectedFrames[index]!.frequencyHz!;

      const semitoneDistance = Math.abs(
        12 * Math.log2(current / previous),
      );

      expect(semitoneDistance).toBeLessThan(8);
    }
  });

  it("returns no pitch for silence", () => {
    const silence = new Float32Array(
      Math.floor(SAMPLE_RATE * DURATION_SECONDS),
    );

    const frames = detectPitch(silence, SAMPLE_RATE);

    expect(frames.length).toBeGreaterThan(0);
    expect(
      frames.every((frame) => frame.frequencyHz === null),
    ).toBe(true);
  });

  it("returns no frames when audio is shorter than the analysis window", () => {
    const frames = detectPitch(
      new Float32Array(100),
      SAMPLE_RATE,
    );

    expect(frames).toHaveLength(0);
  });

  it("uses the center of the analysis window as the timestamp", () => {
    const frames = detectPitch(
      createSineWave(150),
      SAMPLE_RATE,
    );

    expect(frames[0]!.timeSeconds).toBeCloseTo(
      1024 / 2 / SAMPLE_RATE,
    );
  });

  it("produces frames at approximately 10 ms intervals", () => {
    const frames = detectPitch(
      createSineWave(150),
      SAMPLE_RATE,
    );

    for (let index = 1; index < frames.length; index += 1) {
      expect(
        frames[index]!.timeSeconds -
          frames[index - 1]!.timeSeconds,
      ).toBeCloseTo(0.01, 5);
    }
  });

  it("returns frequencies within the configured range", () => {
    const frames = detectPitch(
      createSineWave(150),
      SAMPLE_RATE,
    );

    const detectedFrames = frames.filter(
      (frame) => frame.frequencyHz !== null,
    );

    for (const frame of detectedFrames) {
      expect(frame.frequencyHz).toBeGreaterThanOrEqual(65);
      expect(frame.frequencyHz).toBeLessThanOrEqual(500);
    }
  });

  it("returns clarity values between zero and one", () => {
    const frames = detectPitch(
      createSineWave(150),
      SAMPLE_RATE,
    );

    for (const frame of frames) {
      expect(frame.clarity).toBeGreaterThanOrEqual(0);
      expect(frame.clarity).toBeLessThanOrEqual(1);
    }
  });

  it("rejects an invalid sample rate", () => {
    expect(() =>
      detectPitch(createSineWave(150), 0),
    ).toThrow("Invalid audio sample rate.");
  });

  it("rejects invalid configuration", () => {
    expect(() =>
      detectPitch(createSineWave(150), SAMPLE_RATE, {
        windowSize: 0,
      }),
    ).toThrow("Invalid pitch detection configuration.");
  });

  it("rejects non-finite audio samples", () => {
    const samples = createSineWave(150);
    samples[100] = Number.NaN;

    expect(() =>
      detectPitch(samples, SAMPLE_RATE),
    ).toThrow("Audio contains non-finite samples.");
  });

  it("supports custom analysis options", () => {
    const frames = detectPitch(
      createSineWave(150),
      SAMPLE_RATE,
      {
        windowSize: 1024,
        hopSize: 80,
      },
    );

    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0]!.timeSeconds).toBeCloseTo(
      512 / SAMPLE_RATE,
    );
  });
});
