import { describe, expect, it } from "vitest";
import { detectPitch } from "./pitchDetection";

const SAMPLE_RATE = 44100;
const DURATION = 0.5;

function createSineWave(frequency: number): Float32Array {
  const samples = new Float32Array(Math.floor(SAMPLE_RATE * DURATION));

  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = Math.sin((2 * Math.PI * frequency * i) / SAMPLE_RATE);
  }

  return samples;
}

describe("detectPitch", () => {
  it.each([85, 100, 120, 150, 200, 300])(
    "detects a sine wave at %i Hz",
    (frequency) => {
      const samples = createSineWave(frequency);
      const frames = detectPitch(samples, SAMPLE_RATE);

      const detectedFrames = frames.filter((frame) => frame.frequency !== null);

      expect(detectedFrames.length).toBeGreaterThan(0);

      const averageFrequency =
        detectedFrames.reduce((sum, frame) => sum + frame.frequency!, 0) /
        detectedFrames.length;

      expect(averageFrequency).toBeCloseTo(frequency, -1);
    },
  );

  it("returns no pitch for silence", () => {
    const silence = new Float32Array(Math.floor(SAMPLE_RATE * DURATION));

    const frames = detectPitch(silence, SAMPLE_RATE);

    expect(frames.every((frame) => frame.frequency === null)).toBe(true);
  });

  it("returns no frames when the audio is shorter than the analysis window", () => {
    const shortAudio = new Float32Array(100);

    const frames = detectPitch(shortAudio, SAMPLE_RATE);

    expect(frames).toHaveLength(0);
  });

  it("returns timestamps in increasing order", () => {
    const samples = createSineWave(120);
    const frames = detectPitch(samples, SAMPLE_RATE);

    for (let i = 1; i < frames.length; i += 1) {
      expect(frames[i]!.time).toBeGreaterThan(frames[i - 1]!.time);
    }
  });

  it("returns pitch values within the configured frequency range", () => {
    const samples = createSineWave(150);
    const frames = detectPitch(samples, SAMPLE_RATE);

    const detectedFrames = frames.filter((frame) => frame.frequency !== null);

    for (const frame of detectedFrames) {
      expect(frame.frequency).toBeGreaterThanOrEqual(65);
      expect(frame.frequency).toBeLessThanOrEqual(500);
    }
  });
});
