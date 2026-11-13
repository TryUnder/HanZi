import type { PhonemizedPronunciation } from "../models/phoneme";
import type {
  AlignmentStatus,
  PhonemeGroupAlignment,
  PronunciationAlignment,
  SyllableAlignment,
} from "../models/syllableAlignment";
import type { ForcedAlignmentResult } from "../models/forcedAlignment";

export interface SyllableAlignmentOptions {
  readonly minimumFramesPerSyllable?: number;
}

export type SyllableAlignmentErrorCode =
  | "EMPTY_ALIGNMENT"
  | "INVALID_PHONE_REFERENCE"
  | "MISSING_SYLLABLE"
  | "INVALID_TIMELINE";

export interface SyllableAlignmentError {
  readonly code: SyllableAlignmentErrorCode;
  readonly message: string;
}

export type SyllableAlignmentResult =
  | {
      readonly success: true;
      readonly alignment: PronunciationAlignment;
    }
  | {
      readonly success: false;
      readonly error: SyllableAlignmentError;
    };

interface FrameAccumulator {
  startFrame: number | null;
  endFrame: number | null;
  confidenceSum: number;
  alignedFrames: number;
  firstPhoneIndex: number | null;
  lastPhoneIndex: number | null;
}

interface SyllableAccumulator {
  readonly syllable: FrameAccumulator;
  readonly final: FrameAccumulator;
}

const DEFAULT_MINIMUM_FRAMES_PER_SYLLABLE = 2;
const TIMELINE_TOLERANCE_SECONDS = 0.000001;

/**
 * Charsiu phone labels for Mandarin initials.
 *
 * These are model phone symbols, not arbitrary Pinyin strings.
 * Multi-character initials such as zh, ch and sh are single phones.
 */
const INITIAL_PHONES: ReadonlySet<string> = new Set([
  "zh",
  "ch",
  "sh",
  "b",
  "p",
  "m",
  "f",
  "d",
  "t",
  "n",
  "l",
  "g",
  "k",
  "h",
  "j",
  "q",
  "x",
  "r",
  "z",
  "c",
  "s",
]);

function failure(
  code: SyllableAlignmentErrorCode,
  message: string,
): SyllableAlignmentResult {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}

function isValidConfidence(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function createFrameAccumulator(): FrameAccumulator {
  return {
    startFrame: null,
    endFrame: null,
    confidenceSum: 0,
    alignedFrames: 0,
    firstPhoneIndex: null,
    lastPhoneIndex: null,
  };
}

function addFrame(
  accumulator: FrameAccumulator,
  frameIndex: number,
  confidence: number,
  phoneIndex: number,
): void {
  if (accumulator.startFrame === null) {
    accumulator.startFrame = frameIndex;
  }

  accumulator.endFrame = frameIndex;
  accumulator.confidenceSum += confidence;
  accumulator.alignedFrames += 1;

  if (accumulator.firstPhoneIndex === null) {
    accumulator.firstPhoneIndex = phoneIndex;
  }

  accumulator.lastPhoneIndex = phoneIndex;
}

function validateForcedAlignment(
  alignment: ForcedAlignmentResult,
): SyllableAlignmentError | null {
  if (
    !Number.isFinite(alignment.durationSeconds) ||
    alignment.durationSeconds <= 0 ||
    !Number.isFinite(alignment.frameDurationSeconds) ||
    alignment.frameDurationSeconds <= 0 ||
    !Number.isInteger(alignment.speechFrameCount) ||
    alignment.speechFrameCount < 0 ||
    !Number.isInteger(alignment.alignedFrameCount) ||
    alignment.alignedFrameCount < 0
  ) {
    return {
      code: "INVALID_TIMELINE",
      message: "Forced alignment contains invalid duration or frame counters.",
    };
  }

  if (alignment.frames.length === 0) {
    return {
      code: "INVALID_TIMELINE",
      message: "Forced alignment does not contain any frames.",
    };
  }

  let speechFrameCount = 0;
  let alignedFrameCount = 0;
  let previousTargetPhoneIndex = -1;

  for (let index = 0; index < alignment.frames.length; index += 1) {
    const frame = alignment.frames[index];

    if (frame === undefined) {
      return {
        code: "INVALID_TIMELINE",
        message: "Alignment contains an undefined frame.",
      };
    }

    if (
      frame.frameIndex !== index ||
      !Number.isFinite(frame.timeSeconds) ||
      Math.abs(frame.timeSeconds - index * alignment.frameDurationSeconds) >
        TIMELINE_TOLERANCE_SECONDS
    ) {
      return {
        code: "INVALID_TIMELINE",
        message: "Alignment contains an invalid frame timeline.",
      };
    }

    if (!isValidConfidence(frame.confidence)) {
      return {
        code: "INVALID_TIMELINE",
        message: "Alignment contains an invalid frame confidence.",
      };
    }

    if (frame.isSilence) {
      if (frame.targetPhoneIndex !== null) {
        return {
          code: "INVALID_TIMELINE",
          message: "Silence frames must not reference target phonemes.",
        };
      }

      continue;
    }

    speechFrameCount += 1;

    if (frame.targetPhoneIndex === null) {
      return {
        code: "INVALID_TIMELINE",
        message: "Speech frames must reference a target phoneme.",
      };
    }

    const targetPhoneIndex = frame.targetPhoneIndex;

    if (
      !Number.isInteger(targetPhoneIndex) ||
      targetPhoneIndex < 0 ||
      targetPhoneIndex < previousTargetPhoneIndex
    ) {
      return {
        code: "INVALID_TIMELINE",
        message: "Alignment contains an invalid phoneme sequence.",
      };
    }

    previousTargetPhoneIndex = targetPhoneIndex;
    alignedFrameCount += 1;
  }

  if (
    speechFrameCount !== alignment.speechFrameCount ||
    alignedFrameCount !== alignment.alignedFrameCount
  ) {
    return {
      code: "INVALID_TIMELINE",
      message: "Alignment frame counters do not match the actual frames.",
    };
  }

  return null;
}

function validatePronunciation(
  pronunciation: PhonemizedPronunciation,
): SyllableAlignmentError | null {
  if (
    !Number.isInteger(pronunciation.syllables) ||
    pronunciation.syllables <= 0 ||
    pronunciation.phonemes.length === 0
  ) {
    return {
      code: "EMPTY_ALIGNMENT",
      message: "Pronunciation does not contain valid syllable data.",
    };
  }

  if (pronunciation.phoneIds.length !== pronunciation.phonemes.length) {
    return {
      code: "INVALID_PHONE_REFERENCE",
      message: "Phone IDs and phoneme metadata have different lengths.",
    };
  }

  let previousSyllableIndex = -1;
  let previousPositionInSyllable = -1;

  for (let index = 0; index < pronunciation.phonemes.length; index += 1) {
    const phoneme = pronunciation.phonemes[index];

    if (phoneme === undefined) {
      return {
        code: "INVALID_PHONE_REFERENCE",
        message: "Pronunciation contains an undefined phoneme.",
      };
    }

    if (
      typeof phoneme.symbol !== "string" ||
      !phoneme.symbol.trim() ||
      !Number.isInteger(phoneme.vocabularyId) ||
      phoneme.vocabularyId < 0 ||
      pronunciation.phoneIds[index] !== phoneme.vocabularyId ||
      !Number.isInteger(phoneme.syllableIndex) ||
      phoneme.syllableIndex < 0 ||
      phoneme.syllableIndex >= pronunciation.syllables ||
      !Number.isInteger(phoneme.positionInSyllable) ||
      phoneme.positionInSyllable < 0
    ) {
      return {
        code: "INVALID_PHONE_REFERENCE",
        message: "Pronunciation contains invalid phoneme metadata.",
      };
    }

    if (phoneme.syllableIndex < previousSyllableIndex) {
      return {
        code: "INVALID_PHONE_REFERENCE",
        message: "Phoneme syllable indexes must be ordered.",
      };
    }

    if (phoneme.syllableIndex !== previousSyllableIndex) {
      if (phoneme.syllableIndex !== previousSyllableIndex + 1) {
        return {
          code: "INVALID_PHONE_REFERENCE",
          message: "Pronunciation contains a missing syllable index.",
        };
      }

      previousPositionInSyllable = -1;
    }

    if (phoneme.positionInSyllable <= previousPositionInSyllable) {
      return {
        code: "INVALID_PHONE_REFERENCE",
        message: "Phoneme positions within a syllable must be ordered.",
      };
    }

    previousSyllableIndex = phoneme.syllableIndex;
    previousPositionInSyllable = phoneme.positionInSyllable;
  }

  if (previousSyllableIndex !== pronunciation.syllables - 1) {
    return {
      code: "INVALID_PHONE_REFERENCE",
      message: "Pronunciation does not contain all expected syllables.",
    };
  }

  return null;
}

function createPhonemeGroupAlignment(
  accumulator: FrameAccumulator,
  frameDurationSeconds: number,
): PhonemeGroupAlignment | null {
  if (
    accumulator.startFrame === null ||
    accumulator.endFrame === null ||
    accumulator.alignedFrames === 0 ||
    accumulator.firstPhoneIndex === null ||
    accumulator.lastPhoneIndex === null
  ) {
    return null;
  }

  const startSeconds = accumulator.startFrame * frameDurationSeconds;

  const endSeconds = (accumulator.endFrame + 1) * frameDurationSeconds;

  return {
    startSeconds,
    endSeconds,
    durationSeconds: endSeconds - startSeconds,
    confidence: accumulator.confidenceSum / accumulator.alignedFrames,
    alignedFrames: accumulator.alignedFrames,
    firstPhoneIndex: accumulator.firstPhoneIndex,
    lastPhoneIndex: accumulator.lastPhoneIndex,
  };
}

export function mapAlignmentToSyllables(
  forcedAlignment: ForcedAlignmentResult,
  pronunciation: PhonemizedPronunciation,
  options: SyllableAlignmentOptions = {},
): SyllableAlignmentResult {
  const minimumFramesPerSyllable =
    options.minimumFramesPerSyllable ?? DEFAULT_MINIMUM_FRAMES_PER_SYLLABLE;

  if (
    !Number.isInteger(minimumFramesPerSyllable) ||
    minimumFramesPerSyllable <= 0
  ) {
    return failure(
      "INVALID_TIMELINE",
      "Minimum frames per syllable must be a positive integer.",
    );
  }

  const pronunciationError = validatePronunciation(pronunciation);

  if (pronunciationError !== null) {
    return {
      success: false,
      error: pronunciationError,
    };
  }

  const alignmentError = validateForcedAlignment(forcedAlignment);

  if (alignmentError !== null) {
    return {
      success: false,
      error: alignmentError,
    };
  }

  const accumulators: SyllableAccumulator[] = Array.from(
    { length: pronunciation.syllables },
    () => ({
      syllable: createFrameAccumulator(),
      final: createFrameAccumulator(),
    }),
  );

  for (const frame of forcedAlignment.frames) {
    if (frame.isSilence || frame.targetPhoneIndex === null) {
      continue;
    }

    const phoneme = pronunciation.phonemes[frame.targetPhoneIndex];

    if (phoneme === undefined) {
      return failure(
        "INVALID_PHONE_REFERENCE",
        "Alignment references a phoneme that does not exist.",
      );
    }

    const accumulator = accumulators[phoneme.syllableIndex];

    if (accumulator === undefined) {
      return failure(
        "INVALID_PHONE_REFERENCE",
        "Alignment references an invalid syllable index.",
      );
    }

    addFrame(
      accumulator.syllable,
      frame.frameIndex,
      frame.confidence,
      frame.targetPhoneIndex,
    );

    const isInitial =
      phoneme.positionInSyllable === 0 && INITIAL_PHONES.has(phoneme.symbol);

    if (!isInitial) {
      addFrame(
        accumulator.final,
        frame.frameIndex,
        frame.confidence,
        frame.targetPhoneIndex,
      );
    }
  }

  const syllables: SyllableAlignment[] = [];

  for (let index = 0; index < accumulators.length; index += 1) {
    const accumulator = accumulators[index];

    if (
      accumulator === undefined ||
      accumulator.syllable.startFrame === null ||
      accumulator.syllable.endFrame === null ||
      accumulator.syllable.alignedFrames === 0
    ) {
      return failure(
        "MISSING_SYLLABLE",
        `Syllable ${index} does not have any aligned frames.`,
      );
    }

    const syllableAlignment = createPhonemeGroupAlignment(
      accumulator.syllable,
      forcedAlignment.frameDurationSeconds,
    );

    if (syllableAlignment === null) {
      return failure(
        "INVALID_TIMELINE",
        `Syllable ${index} contains an invalid time interval.`,
      );
    }

    const finalAlignment = createPhonemeGroupAlignment(
      accumulator.final,
      forcedAlignment.frameDurationSeconds,
    );

    const endSeconds = syllableAlignment.endSeconds;

    if (
      !Number.isFinite(syllableAlignment.startSeconds) ||
      !Number.isFinite(endSeconds) ||
      endSeconds >
        forcedAlignment.durationSeconds + forcedAlignment.frameDurationSeconds
    ) {
      return failure(
        "INVALID_TIMELINE",
        `Syllable ${index} contains an invalid time interval.`,
      );
    }

    syllables.push({
      syllableIndex: index,
      startSeconds: syllableAlignment.startSeconds,
      endSeconds,
      durationSeconds: syllableAlignment.durationSeconds,
      confidence: syllableAlignment.confidence,
      alignedFrames: syllableAlignment.alignedFrames,
      finalAlignment,
    });
  }

  const averageConfidence =
    syllables.reduce((sum, syllable) => sum + syllable.confidence, 0) /
    syllables.length;

  const status: AlignmentStatus = syllables.some(
    (syllable) =>
      syllable.alignedFrames < minimumFramesPerSyllable ||
      syllable.finalAlignment === null ||
      syllable.finalAlignment.alignedFrames < minimumFramesPerSyllable,
  )
    ? "insufficient-data"
    : "aligned";

  const alignment: PronunciationAlignment = {
    status,
    durationSeconds: forcedAlignment.durationSeconds,
    syllables,
    averageConfidence,
    alignedFrameCount: forcedAlignment.alignedFrameCount,
    speechFrameCount: forcedAlignment.speechFrameCount,
  };

  return {
    success: true,
    alignment,
  };
}
