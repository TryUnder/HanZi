import type { PitchFrame } from "./pitchDetection";

export interface NormalizedPitchPoint {
  time: number;
  normalizedPitch: number;
  frequency: number;
  clarity: number;
}

export interface PitchNormalizationResult {
  points: NormalizedPitchPoint[];
  minFrequency: number;
  maxFrequency: number;
  duration: number;
}

export interface PitchNormalizationOptions {
  minClarity?: number;
  targetPointCount?: number;
}

const DEFAULT_OPTIONS: Required<PitchNormalizationOptions> = {
  minClarity: 0.35,
  targetPointCount: 50,
};

/**
 * Linearly interpolates a value between two points.
 */
function interpolate(
  first: NormalizedPitchPoint,
  second: NormalizedPitchPoint,
  time: number,
): NormalizedPitchPoint {
  const distance = second.time - first.time;
  const ratio = distance === 0 ? 0 : (time - first.time) / distance;

  return {
    time,
    normalizedPitch:
      first.normalizedPitch +
      (second.normalizedPitch - first.normalizedPitch) * ratio,
    frequency: first.frequency + (second.frequency - first.frequency) * ratio,
    clarity: first.clarity + (second.clarity - first.clarity) * ratio,
  };
}

/**
 * Normalizes a pitch contour to a 0–1 range.
 *
 * 0 represents the lowest detected pitch.
 * 1 represents the highest detected pitch.
 *
 * The original time information is preserved.
 */
export function normalizePitchContour(
  frames: PitchFrame[],
  options: PitchNormalizationOptions = {},
): PitchNormalizationResult {
  const settings = { ...DEFAULT_OPTIONS, ...options };

  if (
    settings.minClarity < 0 ||
    settings.minClarity > 1 ||
    !Number.isInteger(settings.targetPointCount) ||
    settings.targetPointCount < 2
  ) {
    throw new Error("Invalid pitch normalization configuration.");
  }

  const validFrames = frames.filter(
    (frame) =>
      frame.frequency !== null &&
      Number.isFinite(frame.frequency) &&
      frame.frequency > 0 &&
      Number.isFinite(frame.time) &&
      Number.isFinite(frame.clarity) &&
      frame.clarity >= settings.minClarity,
  );

  if (validFrames.length < 2) {
    return {
      points: [],
      minFrequency: 0,
      maxFrequency: 0,
      duration: 0,
    };
  }

  const sortedFrames = [...validFrames].sort(
    (first, second) => first.time - second.time,
  );

  const frequencies = sortedFrames.map((frame) => frame.frequency as number);

  const minFrequency = Math.min(...frequencies);
  const maxFrequency = Math.max(...frequencies);
  const frequencyRange = maxFrequency - minFrequency;

  const duration =
    sortedFrames[sortedFrames.length - 1]!.time - sortedFrames[0]!.time;

  if (duration <= 0) {
    return {
      points: [],
      minFrequency,
      maxFrequency,
      duration: 0,
    };
  }

  const sourcePoints: NormalizedPitchPoint[] = sortedFrames.map((frame) => ({
    time: frame.time,
    frequency: frame.frequency as number,
    normalizedPitch:
      frequencyRange === 0
        ? 0.5
        : ((frame.frequency as number) - minFrequency) / frequencyRange,
    clarity: frame.clarity,
  }));

  const result: NormalizedPitchPoint[] = [];

  const firstTime = sourcePoints[0]!.time;
  const lastTime = sourcePoints[sourcePoints.length - 1]!.time;

  for (let index = 0; index < settings.targetPointCount; index += 1) {
    const ratio = index / (settings.targetPointCount - 1);
    const targetTime = firstTime + ratio * (lastTime - firstTime);

    let rightIndex = sourcePoints.findIndex(
      (point) => point.time >= targetTime,
    );

    if (rightIndex === -1) {
      rightIndex = sourcePoints.length - 1;
    }

    const leftIndex = Math.max(0, rightIndex - 1);
    const left = sourcePoints[leftIndex]!;
    const right = sourcePoints[rightIndex]!;

    const point =
      left.time === right.time
        ? { ...left, time: targetTime }
        : interpolate(left, right, targetTime);

    result.push(point);
  }

  return {
    points: result,
    minFrequency,
    maxFrequency,
    duration,
  };
}
