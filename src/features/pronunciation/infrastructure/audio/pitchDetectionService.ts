import type {
  PitchFrame,
  PitchDetectionOptions,
} from "../../domain/models/pitchFrame";

interface ResolvedPitchDetectionOptions {
  readonly minFrequencyHz: number;
  readonly maxFrequencyHz: number;
  readonly windowSize: number;
  readonly hopSize: number;
  readonly threshold: number;
  readonly fallbackThreshold: number;
  readonly minimumRms: number;
}

interface PitchCandidate {
  readonly frequencyHz: number;
  readonly clarity: number;
  readonly normalizedDifference: number;
}

interface FramePitchResult {
  readonly candidates: readonly PitchCandidate[];
}

interface CandidatePathState {
  readonly cost: number;
  readonly previousCandidateIndex: number;
}

type PathCandidate = PitchCandidate | null;

const DEFAULT_OPTIONS: ResolvedPitchDetectionOptions = {
  minFrequencyHz: 65,
  maxFrequencyHz: 500,
  windowSize: 1024,
  hopSize: 160,
  threshold: 0.15,
  fallbackThreshold: 0.35,
  minimumRms: 0.004,
};

const TRANSITION_COST_PER_SEMITONE = 0.035;
const OCTAVE_JUMP_PENALTY = 1.0;
const VOICED_UNVOICED_TRANSITION_COST = 0.12;
const MISSING_PITCH_EMISSION_COST = 0.58;
const FALLBACK_CANDIDATE_PENALTY = 0.04;

function resolveOptions(
  options: PitchDetectionOptions,
): ResolvedPitchDetectionOptions {
  const resolved = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  if (
    !Number.isFinite(resolved.minFrequencyHz) ||
    !Number.isFinite(resolved.maxFrequencyHz) ||
    resolved.minFrequencyHz <= 0 ||
    resolved.maxFrequencyHz <= resolved.minFrequencyHz ||
    !Number.isInteger(resolved.windowSize) ||
    resolved.windowSize < 32 ||
    !Number.isInteger(resolved.hopSize) ||
    resolved.hopSize <= 0 ||
    !Number.isFinite(resolved.threshold) ||
    !Number.isFinite(resolved.fallbackThreshold) ||
    resolved.threshold <= 0 ||
    resolved.threshold >= resolved.fallbackThreshold ||
    resolved.fallbackThreshold > 1 ||
    !Number.isFinite(resolved.minimumRms) ||
    resolved.minimumRms < 0
  ) {
    throw new Error("Invalid pitch detection configuration.");
  }

  return resolved;
}

function calculateRms(samples: Float32Array, windowSize: number): number {
  let mean = 0;

  for (let index = 0; index < windowSize; index += 1) {
    mean += samples[index]!;
  }

  mean /= windowSize;

  let energy = 0;

  for (let index = 0; index < windowSize; index += 1) {
    const value = samples[index]! - mean;
    energy += value * value;
  }

  return Math.sqrt(energy / windowSize);
}

function calculateDifferenceFunction(
  samples: Float32Array,
  mean: number,
  windowSize: number,
  maxLag: number,
): Float64Array {
  const difference = new Float64Array(maxLag + 1);

  for (let lag = 1; lag <= maxLag; lag += 1) {
    let sum = 0;
    const comparisonLength = windowSize - lag;

    for (let index = 0; index < comparisonLength; index += 1) {
      const first = samples[index]! - mean;
      const second = samples[index + lag]! - mean;
      const delta = first - second;

      sum += delta * delta;
    }

    difference[lag] = sum;
  }

  return difference;
}

function calculateCumulativeMeanNormalizedDifference(
  difference: Float64Array,
  maxLag: number,
): Float64Array {
  const normalized = new Float64Array(maxLag + 1);

  normalized[0] = 1;

  let runningSum = 0;

  for (let lag = 1; lag <= maxLag; lag += 1) {
    runningSum += difference[lag]!;

    normalized[lag] =
      runningSum === 0 ? 1 : (difference[lag]! * lag) / runningSum;
  }

  return normalized;
}

function refineLag(normalized: Float64Array, lag: number): number {
  if (lag <= 0 || lag >= normalized.length - 1) {
    return lag;
  }

  const previous = normalized[lag - 1]!;
  const current = normalized[lag]!;
  const next = normalized[lag + 1]!;

  const denominator = 2 * (2 * current - next - previous);

  if (Math.abs(denominator) < 0.000001) {
    return lag;
  }

  const adjustment = (next - previous) / denominator;

  return lag + adjustment;
}

function isLocalMinimum(normalized: Float64Array, lag: number): boolean {
  const current = normalized[lag]!;
  const previous = normalized[lag - 1]!;
  const next = normalized[lag + 1]!;

  return (
    current <= previous &&
    current <= next &&
    (current < previous || current < next)
  );
}

function createCandidate(
  normalized: Float64Array,
  lag: number,
  sampleRate: number,
): PitchCandidate | null {
  const refinedLag = refineLag(normalized, lag);

  if (!Number.isFinite(refinedLag) || refinedLag <= 0) {
    return null;
  }

  const frequencyHz = sampleRate / refinedLag;
  const normalizedDifference = normalized[lag]!;

  if (!Number.isFinite(frequencyHz) || !Number.isFinite(normalizedDifference)) {
    return null;
  }

  return {
    frequencyHz,
    clarity: Math.max(0, Math.min(1, 1 - normalizedDifference)),
    normalizedDifference,
  };
}

/**
 * Creates a pitch candidate using the YIN threshold strategy.
 *
 * The first trough below the strict threshold is preferred.
 * The algorithm descends to the bottom of that trough before
 * refining its position.
 *
 * If no trough satisfies the strict threshold, the best available
 * local minimum below the fallback threshold is selected.
 *
 * Only one candidate is returned per frame. This prevents the
 * temporal path selection from choosing a later subharmonic minimum
 * when an earlier fundamental-period minimum is available.
 */
function createPitchCandidates(
  normalized: Float64Array,
  sampleRate: number,
  minLag: number,
  maxLag: number,
  strictThreshold: number,
  fallbackThreshold: number,
): PitchCandidate[] {
  let selectedLag: number | null = null;

  // Prefer the first trough that crosses the strict YIN threshold.
  for (let lag = minLag; lag < maxLag; lag += 1) {
    const difference = normalized[lag];

    if (
      difference === undefined ||
      !Number.isFinite(difference) ||
      difference >= strictThreshold
    ) {
      continue;
    }

    let troughLag = lag;

    // Descend to the bottom of the current trough.
    while (troughLag < maxLag) {
      const current = normalized[troughLag];
      const next = normalized[troughLag + 1];

      if (
        current === undefined ||
        next === undefined ||
        !Number.isFinite(next) ||
        next >= current
      ) {
        break;
      }

      troughLag += 1;
    }

    selectedLag = troughLag;
    break;
  }

  // Fallback: search for the best local minimum below the
  // fallback threshold only if no strict candidate was found.
  if (selectedLag === null) {
    let bestLag: number | null = null;
    let bestDifference = fallbackThreshold;

    for (let lag = minLag + 1; lag < maxLag; lag += 1) {
      const difference = normalized[lag]!;

      if (isLocalMinimum(normalized, lag) && difference < bestDifference) {
        bestDifference = difference;
        bestLag = lag;
      }
    }

    // If no local minimum exists, retain the global-minimum fallback.
    if (bestLag === null) {
      for (let lag = minLag; lag <= maxLag; lag += 1) {
        const difference = normalized[lag];

        if (
          difference !== undefined &&
          Number.isFinite(difference) &&
          difference < bestDifference
        ) {
          bestDifference = difference;
          bestLag = lag;
        }
      }
    }

    selectedLag = bestLag;
  }

  if (selectedLag === null) {
    return [];
  }

  const candidate = createCandidate(normalized, selectedLag, sampleRate);

  return candidate === null ? [] : [candidate];
}

function detectFramePitch(
  samples: Float32Array,
  sampleRate: number,
  options: ResolvedPitchDetectionOptions,
): FramePitchResult {
  const {
    minFrequencyHz,
    maxFrequencyHz,
    windowSize,
    minimumRms,
    threshold,
    fallbackThreshold,
  } = options;

  const minLag = Math.max(2, Math.floor(sampleRate / maxFrequencyHz));

  const maxLag = Math.min(
    Math.floor(sampleRate / minFrequencyHz),
    Math.floor(windowSize / 2) - 1,
  );

  if (samples.length < windowSize || maxLag <= minLag) {
    return { candidates: [] };
  }

  const rms = calculateRms(samples, windowSize);

  if (rms < minimumRms) {
    return { candidates: [] };
  }

  let mean = 0;

  for (let index = 0; index < windowSize; index += 1) {
    mean += samples[index]!;
  }

  mean /= windowSize;

  const difference = calculateDifferenceFunction(
    samples,
    mean,
    windowSize,
    maxLag,
  );

  const normalized = calculateCumulativeMeanNormalizedDifference(
    difference,
    maxLag,
  );

  const candidates = createPitchCandidates(
    normalized,
    sampleRate,
    minLag,
    maxLag,
    threshold,
    fallbackThreshold,
  ).filter(
    (candidate) =>
      candidate.frequencyHz >= minFrequencyHz &&
      candidate.frequencyHz <= maxFrequencyHz,
  );

  return { candidates };
}

function calculateTransitionCost(
  previousFrequencyHz: number | null,
  currentFrequencyHz: number | null,
): number {
  if (previousFrequencyHz === null && currentFrequencyHz === null) {
    return 0;
  }

  if (previousFrequencyHz === null || currentFrequencyHz === null) {
    return VOICED_UNVOICED_TRANSITION_COST;
  }

  const semitoneDistance = Math.abs(
    12 * Math.log2(currentFrequencyHz / previousFrequencyHz),
  );

  const octaveJumpPenalty =
    semitoneDistance >= 10 && semitoneDistance <= 14 ? OCTAVE_JUMP_PENALTY : 0;

  return semitoneDistance * TRANSITION_COST_PER_SEMITONE + octaveJumpPenalty;
}

function calculateEmissionCost(
  candidate: PitchCandidate | null,
  strictThreshold: number,
  hasCandidates: boolean,
): number {
  if (candidate === null) {
    return hasCandidates ? MISSING_PITCH_EMISSION_COST : 0;
  }

  const fallbackPenalty =
    candidate.normalizedDifference > strictThreshold
      ? FALLBACK_CANDIDATE_PENALTY
      : 0;

  return candidate.normalizedDifference + fallbackPenalty;
}

function getPathCandidates(frameResult: FramePitchResult): PathCandidate[] {
  return [...frameResult.candidates, null];
}

function selectContinuousPitchPath(
  frameResults: readonly FramePitchResult[],
  strictThreshold: number,
): (PitchCandidate | null)[] {
  if (frameResults.length === 0) {
    return [];
  }

  const states: CandidatePathState[][] = [];

  for (let frameIndex = 0; frameIndex < frameResults.length; frameIndex += 1) {
    const frameResult = frameResults[frameIndex]!;
    const currentCandidates = getPathCandidates(frameResult);
    const currentStates: CandidatePathState[] = [];

    for (
      let candidateIndex = 0;
      candidateIndex < currentCandidates.length;
      candidateIndex += 1
    ) {
      const candidate = currentCandidates[candidateIndex]!;

      const emissionCost = calculateEmissionCost(
        candidate,
        strictThreshold,
        frameResult.candidates.length > 0,
      );

      if (frameIndex === 0) {
        currentStates.push({
          cost: emissionCost,
          previousCandidateIndex: -1,
        });

        continue;
      }

      const previousCandidates = getPathCandidates(
        frameResults[frameIndex - 1]!,
      );

      const previousStates = states[frameIndex - 1]!;

      let bestCost = Number.POSITIVE_INFINITY;
      let bestPreviousIndex = -1;

      for (
        let previousIndex = 0;
        previousIndex < previousCandidates.length;
        previousIndex += 1
      ) {
        const previousCandidate = previousCandidates[previousIndex]!;

        const transitionCost = calculateTransitionCost(
          previousCandidate?.frequencyHz ?? null,
          candidate?.frequencyHz ?? null,
        );

        const totalCost =
          previousStates[previousIndex]!.cost + transitionCost + emissionCost;

        if (totalCost < bestCost) {
          bestCost = totalCost;
          bestPreviousIndex = previousIndex;
        }
      }

      currentStates.push({
        cost: bestCost,
        previousCandidateIndex: bestPreviousIndex,
      });
    }

    states.push(currentStates);
  }

  const lastStates = states[states.length - 1]!;

  let bestLastIndex = 0;

  for (let index = 1; index < lastStates.length; index += 1) {
    if (lastStates[index]!.cost < lastStates[bestLastIndex]!.cost) {
      bestLastIndex = index;
    }
  }

  const selected: (PitchCandidate | null)[] = Array.from(
    { length: frameResults.length },
    () => null,
  );

  let selectedCandidateIndex = bestLastIndex;

  for (
    let frameIndex = frameResults.length - 1;
    frameIndex >= 0;
    frameIndex -= 1
  ) {
    const candidates = getPathCandidates(frameResults[frameIndex]!);

    selected[frameIndex] = candidates[selectedCandidateIndex] ?? null;

    if (frameIndex > 0) {
      selectedCandidateIndex =
        states[frameIndex]![selectedCandidateIndex]!.previousCandidateIndex;
    }
  }

  return selected;
}

/**
 * Detects fundamental frequency using YIN.
 *
 * Each frame uses the first qualifying YIN minimum to reduce
 * subharmonic errors. A temporal path selection then discourages
 * abrupt pitch changes and tolerates short unvoiced gaps.
 *
 * Frame timestamps represent the center of each analysis window.
 */
export function detectPitch(
  audioData: Float32Array,
  sampleRate: number,
  customOptions: PitchDetectionOptions = {},
): PitchFrame[] {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error("Invalid audio sample rate.");
  }

  const options = resolveOptions(customOptions);

  for (let index = 0; index < audioData.length; index += 1) {
    if (!Number.isFinite(audioData[index]!)) {
      throw new Error("Audio contains non-finite samples.");
    }
  }

  if (audioData.length < options.windowSize) {
    return [];
  }

  const frameResults: FramePitchResult[] = [];
  const frameTimes: number[] = [];

  for (
    let start = 0;
    start + options.windowSize <= audioData.length;
    start += options.hopSize
  ) {
    const samples = audioData.subarray(start, start + options.windowSize);

    frameResults.push(detectFramePitch(samples, sampleRate, options));

    frameTimes.push((start + options.windowSize / 2) / sampleRate);
  }

  const selectedPath = selectContinuousPitchPath(
    frameResults,
    options.threshold,
  );

  return selectedPath.map((candidate, index) => ({
    timeSeconds: frameTimes[index]!,
    frequencyHz: candidate?.frequencyHz ?? null,
    clarity: candidate?.clarity ?? 0,
  }));
}
