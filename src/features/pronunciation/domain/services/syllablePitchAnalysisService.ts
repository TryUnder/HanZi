
import type { PitchFrame } from "../models/pitchFrame";
import type {
  SyllablePitchContour,
  SyllablePitchPoint,
  WordPitchAnalysis,
} from "../models/syllablePitchContour";
import type { SyllableAlignment } from "../models/syllableAlignment";

export interface SyllablePitchAnalysisOptions {
  readonly frameWindowDurationSeconds?: number;
  readonly minimumClarity?: number;
  readonly minimumFrames?: number;
  readonly minimumVoicedRatio?: number;
}

interface ResolvedOptions {
  readonly frameWindowDurationSeconds: number;
  readonly minimumClarity: number;
  readonly minimumFrames: number;
  readonly minimumVoicedRatio: number;
}

interface PreparedSyllable {
  readonly alignment: SyllableAlignment;
  readonly analysisStartSeconds: number;
  readonly analysisEndSeconds: number;
  readonly analysisDurationSeconds: number;
  readonly availableFrames: readonly PitchFrame[];
  readonly voicedFrames: readonly PitchFrame[];
  readonly hasFinalAlignment: boolean;
}

const DEFAULT_OPTIONS: ResolvedOptions = {
  frameWindowDurationSeconds: 1024 / 16000,
  minimumClarity: 0.35,
  minimumFrames: 5,
  minimumVoicedRatio: 0.35,
};

function resolveOptions(
  options: SyllablePitchAnalysisOptions,
): ResolvedOptions {
  const resolved = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  if (
    !Number.isFinite(resolved.frameWindowDurationSeconds) ||
    resolved.frameWindowDurationSeconds <= 0 ||
    !Number.isFinite(resolved.minimumClarity) ||
    resolved.minimumClarity < 0 ||
    resolved.minimumClarity > 1 ||
    !Number.isInteger(resolved.minimumFrames) ||
    resolved.minimumFrames < 2 ||
    !Number.isFinite(resolved.minimumVoicedRatio) ||
    resolved.minimumVoicedRatio < 0 ||
    resolved.minimumVoicedRatio > 1
  ) {
    throw new Error(
      "Invalid syllable pitch analysis configuration.",
    );
  }

  return resolved;
}

function median(values: readonly number[]): number {
  if (values.length === 0) {
    throw new Error(
      "Cannot calculate median of an empty collection.",
    );
  }

  const sorted = [...values].sort(
    (first, second) => first - second,
  );

  const middleIndex = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middleIndex]!;
  }

  return (
    sorted[middleIndex - 1]! +
    sorted[middleIndex]!
  ) / 2;
}

function validateInputs(
  frames: readonly PitchFrame[],
  alignments: readonly SyllableAlignment[],
): void {
  for (const frame of frames) {
    if (
      !Number.isFinite(frame.timeSeconds) ||
      !Number.isFinite(frame.clarity) ||
      frame.clarity < 0 ||
      frame.clarity > 1 ||
      (frame.frequencyHz !== null &&
        (!Number.isFinite(frame.frequencyHz) ||
          frame.frequencyHz <= 0))
    ) {
      throw new Error("Invalid pitch frame.");
    }
  }

  for (const alignment of alignments) {
    if (
      !Number.isInteger(alignment.syllableIndex) ||
      alignment.syllableIndex < 0 ||
      !Number.isFinite(alignment.startSeconds) ||
      !Number.isFinite(alignment.endSeconds) ||
      !Number.isFinite(alignment.durationSeconds) ||
      alignment.startSeconds < 0 ||
      alignment.endSeconds <= alignment.startSeconds ||
      alignment.durationSeconds <= 0 ||
      Math.abs(
        alignment.durationSeconds -
          (alignment.endSeconds - alignment.startSeconds),
      ) > 0.01
    ) {
      throw new Error("Invalid syllable alignment.");
    }

    const finalAlignment = alignment.finalAlignment;

    if (finalAlignment === null) {
      continue;
    }

    if (
      !Number.isFinite(finalAlignment.startSeconds) ||
      !Number.isFinite(finalAlignment.endSeconds) ||
      !Number.isFinite(finalAlignment.durationSeconds) ||
      !Number.isFinite(finalAlignment.confidence) ||
      finalAlignment.startSeconds < alignment.startSeconds ||
      finalAlignment.endSeconds > alignment.endSeconds + 0.01 ||
      finalAlignment.endSeconds <= finalAlignment.startSeconds ||
      finalAlignment.durationSeconds <= 0 ||
      finalAlignment.confidence < 0 ||
      finalAlignment.confidence > 1 ||
      !Number.isInteger(finalAlignment.alignedFrames) ||
      finalAlignment.alignedFrames <= 0 ||
      !Number.isInteger(finalAlignment.firstPhoneIndex) ||
      !Number.isInteger(finalAlignment.lastPhoneIndex) ||
      finalAlignment.firstPhoneIndex < 0 ||
      finalAlignment.lastPhoneIndex <
        finalAlignment.firstPhoneIndex ||
      Math.abs(
        finalAlignment.durationSeconds -
          (finalAlignment.endSeconds -
            finalAlignment.startSeconds),
      ) > 0.01
    ) {
      throw new Error("Invalid final alignment.");
    }
  }

  for (
    let index = 1;
    index < alignments.length;
    index += 1
  ) {
    if (
      alignments[index]!.syllableIndex <=
      alignments[index - 1]!.syllableIndex
    ) {
      throw new Error(
        "Syllable alignments must be ordered.",
      );
    }
  }
}

function prepareSyllables(
  frames: readonly PitchFrame[],
  alignments: readonly SyllableAlignment[],
  options: ResolvedOptions,
): PreparedSyllable[] {
  const halfWindow =
    options.frameWindowDurationSeconds / 2;

  return alignments.map((alignment) => {
    const finalAlignment = alignment.finalAlignment;

    // Never fall back to the full syllable when the final is missing.
    // Doing so would reintroduce initial consonants into tone analysis.
    if (finalAlignment === null) {
      return {
        alignment,
        analysisStartSeconds: alignment.startSeconds,
        analysisEndSeconds: alignment.endSeconds,
        analysisDurationSeconds: alignment.durationSeconds,
        availableFrames: [],
        voicedFrames: [],
        hasFinalAlignment: false,
      };
    }

    const analysisStartSeconds =
      finalAlignment.startSeconds;

    const analysisEndSeconds =
      finalAlignment.endSeconds;

    const analysisDurationSeconds =
      finalAlignment.durationSeconds;

    const availableFrames = frames.filter((frame) => {
      const windowStart =
        frame.timeSeconds - halfWindow;

      const windowEnd =
        frame.timeSeconds + halfWindow;

      return (
        windowStart >= analysisStartSeconds &&
        windowEnd <= analysisEndSeconds
      );
    });

    const voicedFrames = availableFrames.filter(
      (frame) =>
        frame.frequencyHz !== null &&
        frame.clarity >= options.minimumClarity,
    );

    return {
      alignment,
      analysisStartSeconds,
      analysisEndSeconds,
      analysisDurationSeconds,
      availableFrames,
      voicedFrames,
      hasFinalAlignment: true,
    };
  });
}

function createContour(
  prepared: PreparedSyllable,
  referenceFrequencyHz: number | null,
  options: ResolvedOptions,
): SyllablePitchContour {
  const {
    alignment,
    analysisStartSeconds,
    analysisEndSeconds,
    analysisDurationSeconds,
    availableFrames,
    voicedFrames,
    hasFinalAlignment,
  } = prepared;

  const frequencies = voicedFrames.map(
    (frame) => frame.frequencyHz!,
  );

  const voicedRatio =
    availableFrames.length === 0
      ? 0
      : voicedFrames.length / availableFrames.length;

  const hasEnoughData =
    hasFinalAlignment &&
    referenceFrequencyHz !== null &&
    voicedFrames.length >= options.minimumFrames &&
    voicedRatio >= options.minimumVoicedRatio;

  const points: SyllablePitchPoint[] =
    hasEnoughData && referenceFrequencyHz !== null
      ? voicedFrames.map((frame) => {
          const frequencyHz = frame.frequencyHz!;

          return {
            timeSeconds: frame.timeSeconds,
            relativePosition:
              (frame.timeSeconds -
                analysisStartSeconds) /
              analysisDurationSeconds,
            frequencyHz,
            semitonesFromReference:
              12 *
              Math.log2(
                frequencyHz / referenceFrequencyHz,
              ),
            clarity: frame.clarity,
          };
        })
      : [];

  return {
    syllableIndex: alignment.syllableIndex,
    startSeconds: analysisStartSeconds,
    endSeconds: analysisEndSeconds,
    durationSeconds: analysisDurationSeconds,
    status: hasEnoughData
      ? "analyzed"
      : "insufficient-data",
    points,
    voicedFrameCount: voicedFrames.length,
    availableFrameCount: availableFrames.length,
    voicedRatio,
    medianFrequencyHz:
      frequencies.length > 0
        ? median(frequencies)
        : null,
    minimumFrequencyHz:
      frequencies.length > 0
        ? Math.min(...frequencies)
        : null,
    maximumFrequencyHz:
      frequencies.length > 0
        ? Math.max(...frequencies)
        : null,
  };
}

/**
 * Extracts pitch contours from the final (vowel/rhyme) portion
 * of each aligned Mandarin syllable.
 *
 * Initial consonants are excluded using the final intervals
 * derived from Charsiu phone alignment.
 *
 * The reference frequency is shared across all analyzed finals
 * in the word.
 */
export function analyzeSyllablePitch(
  frames: readonly PitchFrame[],
  alignments: readonly SyllableAlignment[],
  customOptions: SyllablePitchAnalysisOptions = {},
): WordPitchAnalysis {
  const options = resolveOptions(customOptions);

  validateInputs(frames, alignments);

  if (alignments.length === 0) {
    throw new Error(
      "At least one syllable alignment is required.",
    );
  }

  const prepared = prepareSyllables(
    frames,
    alignments,
    options,
  );

  const allVoicedFrequencies = prepared.flatMap(
    (syllable) =>
      syllable.voicedFrames.map(
        (frame) => frame.frequencyHz!,
      ),
  );

  const referenceFrequencyHz =
    allVoicedFrequencies.length >= options.minimumFrames
      ? median(allVoicedFrequencies)
      : null;

  const syllables = prepared.map((syllable) =>
    createContour(
      syllable,
      referenceFrequencyHz,
      options,
    ),
  );

  return {
    status: syllables.every(
      (syllable) => syllable.status === "analyzed",
    )
      ? "analyzed"
      : "insufficient-data",
    referenceFrequencyHz,
    syllables,
  };
}
