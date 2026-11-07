export interface PitchFrame {
  time: number;
  frequency: number | null;
  clarity: number;
}

export interface PitchDetectionOptions {
  minFrequency?: number;
  maxFrequency?: number;
  windowSize?: number;
  hopSize?: number;
  threshold?: number;
  fallbackThreshold?: number;
}

const DEFAULT_OPTIONS: Required<PitchDetectionOptions> = {
  minFrequency: 65,
  maxFrequency: 500,
  windowSize: 4096,
  hopSize: 256,
  threshold: 0.15,
  fallbackThreshold: 0.35,
};

function detectFramePitch(
  samples: Float32Array,
  sampleRate: number,
  options: Required<PitchDetectionOptions>,
): { frequency: number | null; clarity: number } {
  const {
    minFrequency,
    maxFrequency,
    windowSize,
    threshold,
    fallbackThreshold,
  } = options;

  const minLag = Math.max(2, Math.floor(sampleRate / maxFrequency));
  const maxLag = Math.min(
    Math.floor(sampleRate / minFrequency),
    Math.floor(windowSize / 2),
  );

  if (samples.length < windowSize || maxLag <= minLag) {
    return { frequency: null, clarity: 0 };
  }

  // Remove DC offset and reject nearly silent frames.
  let mean = 0;

  for (let i = 0; i < windowSize; i += 1) {
    mean += samples[i]!;
  }

  mean /= windowSize;

  let energy = 0;

  for (let i = 0; i < windowSize; i += 1) {
    const value = samples[i]! - mean;
    energy += value * value;
  }

  const rms = Math.sqrt(energy / windowSize);

  if (rms < 0.008) {
    return { frequency: null, clarity: 0 };
  }

  const difference = new Float32Array(maxLag + 1);
  const normalized = new Float32Array(maxLag + 1);

  // YIN difference function.
  for (let lag = 1; lag <= maxLag; lag += 1) {
    let sum = 0;

    for (let i = 0; i < windowSize - maxLag; i += 1) {
      const first = samples[i]! - mean;
      const second = samples[i + lag]! - mean;
      const delta = first - second;

      sum += delta * delta;
    }

    difference[lag] = sum;
  }

  // Cumulative mean normalized difference.
  normalized[0] = 1;

  let runningSum = 0;

  for (let lag = 1; lag <= maxLag; lag += 1) {
    runningSum += difference[lag]!;
    normalized[lag] =
      runningSum === 0 ? 1 : (difference[lag]! * lag) / runningSum;
  }

  // Prefer the first minimum below the normal YIN threshold.
  let selectedLag = -1;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    if (normalized[lag]! < threshold) {
      selectedLag = lag;

      while (
        selectedLag < maxLag &&
        normalized[selectedLag + 1]! < normalized[selectedLag]!
      ) {
        selectedLag += 1;
      }

      break;
    }
  }

  // If the strict threshold was not reached, use the best local result.
  // This helps avoid unnecessary gaps in voiced speech.
  if (selectedLag === -1) {
    let bestValue = Number.POSITIVE_INFINITY;

    for (let lag = minLag; lag <= maxLag; lag += 1) {
      const value = normalized[lag]!;

      if (value < bestValue) {
        bestValue = value;
        selectedLag = lag;
      }
    }

    if (bestValue > fallbackThreshold) {
      return { frequency: null, clarity: 0 };
    }
  }

  const previous = normalized[selectedLag - 1]!;
  const current = normalized[selectedLag]!;
  const next = normalized[selectedLag + 1] ?? current;

  const denominator = 2 * (2 * current - next - previous);

  const adjustment =
    Math.abs(denominator) < 0.000001 ? 0 : (next - previous) / denominator;

  const refinedLag = selectedLag + adjustment;
  const frequency = sampleRate / refinedLag;
  const clarity = Math.max(0, Math.min(1, 1 - current));

  if (
    !Number.isFinite(frequency) ||
    frequency < minFrequency ||
    frequency > maxFrequency
  ) {
    return { frequency: null, clarity: 0 };
  }

  return { frequency, clarity };
}

export function detectPitch(
  audioData: Float32Array,
  sampleRate: number,
  customOptions: PitchDetectionOptions = {},
): PitchFrame[] {
  const options = { ...DEFAULT_OPTIONS, ...customOptions };

  if (
    sampleRate <= 0 ||
    options.windowSize <= 0 ||
    options.hopSize <= 0 ||
    options.minFrequency <= 0 ||
    options.maxFrequency <= options.minFrequency ||
    options.threshold <= 0 ||
    options.fallbackThreshold <= options.threshold
  ) {
    throw new Error("Invalid pitch detection configuration.");
  }

  if (audioData.length < options.windowSize) {
    return [];
  }

  const frames: PitchFrame[] = [];

  for (
    let start = 0;
    start + options.windowSize <= audioData.length;
    start += options.hopSize
  ) {
    const frame = audioData.subarray(start, start + options.windowSize);
    const result = detectFramePitch(frame, sampleRate, options);

    frames.push({
      time: start / sampleRate,
      frequency: result.frequency,
      clarity: result.clarity,
    });
  }

  return frames;
}
