import type { PhonemizedPronunciation } from "../models/phoneme";
import type { ForcedAlignmentResult } from "../models/forcedAlignment";
import type { PronunciationAlignment } from "../models/syllableAlignment";
import type {
  AlignmentQualityIssue,
  AlignmentQualityReport,
  AlignmentQualityStatus,
  PhonemeAlignmentQuality,
  SyllableAlignmentQuality,
} from "../models/alignmentQuality";

export interface AlignmentQualityOptions {
  readonly minimumFramesPerPhoneme?: number;
  readonly minimumFramesPerSyllable?: number;
  readonly minimumPhonemeConfidence?: number;
  readonly minimumSyllableConfidence?: number;
  readonly minimumSyllableDurationSeconds?: number;
  readonly maximumSyllableDurationSeconds?: number;
  readonly maximumSyllableFrameShare?: number;
}

interface PhonemeAccumulator {
  confidenceSum: number;
  minimumConfidence: number | null;
  alignedFrames: number;
}

const DEFAULT_OPTIONS: Required<AlignmentQualityOptions> = {
  minimumFramesPerPhoneme: 2,
  minimumFramesPerSyllable: 8,
  minimumPhonemeConfidence: 0.05,
  minimumSyllableConfidence: 0.15,
  minimumSyllableDurationSeconds: 0.04,
  maximumSyllableDurationSeconds: 1.5,
  maximumSyllableFrameShare: 0.9,
};

function isValidOptions(options: Required<AlignmentQualityOptions>): boolean {
  return (
    Number.isInteger(options.minimumFramesPerPhoneme) &&
    options.minimumFramesPerPhoneme > 0 &&
    Number.isInteger(options.minimumFramesPerSyllable) &&
    options.minimumFramesPerSyllable > 0 &&
    Number.isFinite(options.minimumPhonemeConfidence) &&
    options.minimumPhonemeConfidence >= 0 &&
    options.minimumPhonemeConfidence <= 1 &&
    Number.isFinite(options.minimumSyllableConfidence) &&
    options.minimumSyllableConfidence >= 0 &&
    options.minimumSyllableConfidence <= 1 &&
    Number.isFinite(options.minimumSyllableDurationSeconds) &&
    options.minimumSyllableDurationSeconds > 0 &&
    Number.isFinite(options.maximumSyllableDurationSeconds) &&
    options.maximumSyllableDurationSeconds >
      options.minimumSyllableDurationSeconds &&
    Number.isFinite(options.maximumSyllableFrameShare) &&
    options.maximumSyllableFrameShare > 0 &&
    options.maximumSyllableFrameShare <= 1
  );
}

function createAccumulators(count: number): PhonemeAccumulator[] {
  return Array.from({ length: count }, () => ({
    confidenceSum: 0,
    minimumConfidence: null,
    alignedFrames: 0,
  }));
}

function addIssue(
  issues: AlignmentQualityIssue[],
  issue: AlignmentQualityIssue,
): void {
  issues.push(issue);
}

export function evaluateAlignmentQuality(
  forcedAlignment: ForcedAlignmentResult,
  pronunciation: PhonemizedPronunciation,
  syllableAlignment: PronunciationAlignment,
  options: AlignmentQualityOptions = {},
): AlignmentQualityReport {
  const thresholds: Required<AlignmentQualityOptions> = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  if (!isValidOptions(thresholds)) {
    throw new Error("Invalid alignment quality options.");
  }

  if (
    pronunciation.syllables <= 0 ||
    pronunciation.phonemes.length === 0 ||
    syllableAlignment.syllables.length !== pronunciation.syllables ||
    forcedAlignment.frames.length === 0
  ) {
    throw new Error("Cannot evaluate an incomplete alignment.");
  }

  const accumulators = createAccumulators(pronunciation.phonemes.length);

  for (const frame of forcedAlignment.frames) {
    if (frame.isSilence || frame.targetPhoneIndex === null) {
      continue;
    }

    const accumulator = accumulators[frame.targetPhoneIndex];

    if (accumulator === undefined) {
      throw new Error("Alignment references an unknown target phoneme.");
    }

    accumulator.confidenceSum += frame.confidence;
    accumulator.alignedFrames += 1;

    accumulator.minimumConfidence =
      accumulator.minimumConfidence === null
        ? frame.confidence
        : Math.min(accumulator.minimumConfidence, frame.confidence);
  }

  const phonemes: PhonemeAlignmentQuality[] = pronunciation.phonemes.map(
    (phoneme, index) => {
      const accumulator = accumulators[index];

      if (accumulator === undefined) {
        throw new Error("Missing phoneme accumulator.");
      }

      return {
        phonemeIndex: index,
        symbol: phoneme.symbol,
        syllableIndex: phoneme.syllableIndex,
        alignedFrames: accumulator.alignedFrames,
        averageConfidence:
          accumulator.alignedFrames > 0
            ? accumulator.confidenceSum / accumulator.alignedFrames
            : 0,
        minimumConfidence: accumulator.minimumConfidence,
      };
    },
  );

  const issues: AlignmentQualityIssue[] = [];

  for (const phoneme of phonemes) {
    if (phoneme.alignedFrames === 0) {
      addIssue(issues, {
        code: "MISSING_PHONEME_FRAMES",
        severity: "error",
        message: `Phoneme ${phoneme.symbol} has no aligned frames.`,
        syllableIndex: phoneme.syllableIndex,
        phonemeIndex: phoneme.phonemeIndex,
      });

      continue;
    }

    if (phoneme.alignedFrames < thresholds.minimumFramesPerPhoneme) {
      addIssue(issues, {
        code: "INSUFFICIENT_PHONEME_FRAMES",
        severity: "warning",
        message: `Phoneme ${phoneme.symbol} has too few aligned frames.`,
        syllableIndex: phoneme.syllableIndex,
        phonemeIndex: phoneme.phonemeIndex,
      });
    }

    if (phoneme.averageConfidence < thresholds.minimumPhonemeConfidence) {
      addIssue(issues, {
        code: "LOW_PHONEME_CONFIDENCE",
        severity: "warning",
        message: `Phoneme ${phoneme.symbol} has low alignment confidence.`,
        syllableIndex: phoneme.syllableIndex,
        phonemeIndex: phoneme.phonemeIndex,
      });
    }
  }

  const totalAlignedFrames = phonemes.reduce(
    (sum, phoneme) => sum + phoneme.alignedFrames,
    0,
  );

  const syllables: SyllableAlignmentQuality[] = syllableAlignment.syllables.map(
    (syllable) => {
      const syllablePhonemes = phonemes.filter(
        (phoneme) => phoneme.syllableIndex === syllable.syllableIndex,
      );

      const alignedFrames = syllablePhonemes.reduce(
        (sum, phoneme) => sum + phoneme.alignedFrames,
        0,
      );

      const confidenceSum = syllablePhonemes.reduce(
        (sum, phoneme) =>
          sum + phoneme.averageConfidence * phoneme.alignedFrames,
        0,
      );

      return {
        syllableIndex: syllable.syllableIndex,
        alignedFrames,
        averageConfidence:
          alignedFrames > 0 ? confidenceSum / alignedFrames : 0,
        durationSeconds: syllable.durationSeconds,
        frameShare:
          totalAlignedFrames > 0 ? alignedFrames / totalAlignedFrames : 0,
      };
    },
  );

  for (const syllable of syllables) {
    if (syllable.alignedFrames < thresholds.minimumFramesPerSyllable) {
      addIssue(issues, {
        code: "INSUFFICIENT_SYLLABLE_FRAMES",
        severity: "error",
        message: `Syllable ${syllable.syllableIndex} has too few aligned frames.`,
        syllableIndex: syllable.syllableIndex,
      });
    }

    if (syllable.averageConfidence < thresholds.minimumSyllableConfidence) {
      addIssue(issues, {
        code: "LOW_SYLLABLE_CONFIDENCE",
        severity: "warning",
        message: `Syllable ${syllable.syllableIndex} has low alignment confidence.`,
        syllableIndex: syllable.syllableIndex,
      });
    }

    if (syllable.durationSeconds < thresholds.minimumSyllableDurationSeconds) {
      addIssue(issues, {
        code: "SYLLABLE_TOO_SHORT",
        severity: "error",
        message: `Syllable ${syllable.syllableIndex} is too short.`,
        syllableIndex: syllable.syllableIndex,
      });
    }

    if (syllable.durationSeconds > thresholds.maximumSyllableDurationSeconds) {
      addIssue(issues, {
        code: "SYLLABLE_TOO_LONG",
        severity: "error",
        message: `Syllable ${syllable.syllableIndex} is too long.`,
        syllableIndex: syllable.syllableIndex,
      });
    }

    if (
      syllable.frameShare > thresholds.maximumSyllableFrameShare &&
      syllables.length > 1
    ) {
      addIssue(issues, {
        code: "EXTREME_FRAME_DISTRIBUTION",
        severity: "error",
        message: `Syllable ${syllable.syllableIndex} contains an unusually large share of aligned frames.`,
        syllableIndex: syllable.syllableIndex,
      });
    }
  }

  const averageConfidence =
    totalAlignedFrames > 0
      ? phonemes.reduce(
          (sum, phoneme) =>
            sum + phoneme.averageConfidence * phoneme.alignedFrames,
          0,
        ) / totalAlignedFrames
      : 0;

  const hasRejectingErrors = issues.some(
    (issue) =>
      issue.code === "SYLLABLE_TOO_SHORT" ||
      issue.code === "SYLLABLE_TOO_LONG" ||
      issue.code === "EXTREME_FRAME_DISTRIBUTION",
  );

  const hasInsufficientData = issues.some(
    (issue) =>
      issue.code === "MISSING_PHONEME_FRAMES" ||
      issue.code === "INSUFFICIENT_PHONEME_FRAMES" ||
      issue.code === "INSUFFICIENT_SYLLABLE_FRAMES",
  );

  const hasLowConfidence = issues.some(
    (issue) =>
      issue.code === "LOW_PHONEME_CONFIDENCE" ||
      issue.code === "LOW_SYLLABLE_CONFIDENCE",
  );

  const status: AlignmentQualityStatus = hasRejectingErrors
    ? "rejected"
    : hasInsufficientData
      ? "insufficient-data"
      : hasLowConfidence
        ? "low-confidence"
        : "accepted";

  return {
    status,
    averageConfidence,
    phonemes,
    syllables,
    issues,
  };
}
