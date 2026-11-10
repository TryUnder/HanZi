
import type { AlignmentQualityReport } from "../../domain/models/alignmentQuality";
import type {
  ForcedAlignmentErrorCode,
  ForcedAlignmentResult,
} from "../../domain/models/forcedAlignment";
import type { PhonemizedPronunciation } from "../../domain/models/phoneme";
import type { PronunciationSyllableRealization } from "../../domain/models/pronunciationSyllableRealization";
import type {
  PronunciationAlignment,
} from "../../domain/models/syllableAlignment";
import type {
  SyllableToneAssessment,
} from "../../domain/models/syllableToneAssessment";
import type {
  WordPitchAnalysis,
} from "../../domain/models/syllablePitchContour";

import {
  evaluateAlignmentQuality,
} from "../../domain/services/alignmentQualityService";
import {
  assessSyllableTone,
} from "../../domain/services/syllableToneAssessmentService";
import type {
  PhonemizationErrorCode,
} from "../../domain/services/pinyinPhonemizer";
import {
  phonemizePronunciation,
} from "../../domain/services/pinyinPhonemizer";
import type {
  ToneRealizationError,
} from "../../domain/services/toneRealizationService";
import {
  realizeWordPronunciation,
} from "../../domain/services/toneRealizationService";
import {
  analyzeSyllablePitch,
} from "../../domain/services/syllablePitchAnalysisService";
import type {
  SyllableAlignmentErrorCode,
} from "../../domain/services/syllableAlignmentService";
import {
  mapAlignmentToSyllables,
} from "../../domain/services/syllableAlignmentService";

import {
  AudioDecodingError,
  decodeRecordingToMono16k,
} from "../../infrastructure/charsiu/charsiuAudioDecoder";
import type {
  AudioDecodingErrorCode,
} from "../../infrastructure/charsiu/charsiuAudioDecoder";
import {
  alignRecordingToPronunciation,
} from "../../infrastructure/charsiu/charsiuForcedAligner";
import {
  getCharsiuModel,
} from "../../infrastructure/charsiu/charsiuModelProvider";
import {
  detectPitch,
} from "../../infrastructure/audio/pitchDetectionService";

export type PronunciationAnalysisError =
  | {
      readonly stage: "tone-realization";
      readonly code: ToneRealizationError["code"];
      readonly message: string;
    }
  | {
      readonly stage: "model-loading";
      readonly code: "MODEL_UNAVAILABLE";
      readonly message: string;
    }
  | {
      readonly stage: "audio-decoding";
      readonly code: AudioDecodingErrorCode;
      readonly message: string;
    }
  | {
      readonly stage: "phonemization";
      readonly code: PhonemizationErrorCode;
      readonly message: string;
      readonly syllableIndex?: number;
      readonly syllable?: string;
      readonly phone?: string;
    }
  | {
      readonly stage: "forced-alignment";
      readonly code: ForcedAlignmentErrorCode;
      readonly message: string;
    }
  | {
      readonly stage: "syllable-alignment";
      readonly code: SyllableAlignmentErrorCode;
      readonly message: string;
    }
  | {
      readonly stage: "quality-assessment";
      readonly code: "QUALITY_EVALUATION_FAILED";
      readonly message: string;
    };

export type PronunciationToneAnalysis =
  | {
      readonly status: "completed";
      readonly pitchAnalysis: WordPitchAnalysis;
      readonly syllableAssessments: readonly SyllableToneAssessment[];
    }
  | {
      readonly status: "skipped";
      readonly reason:
        | "alignment-rejected"
        | "alignment-low-confidence"
        | "alignment-insufficient-data";
    }
  | {
      readonly status: "failed";
      readonly message: string;
    };

export interface PronunciationAnalysisResult {
  readonly word: string;
  readonly pinyin: string;
  readonly syllableRealizations: readonly PronunciationSyllableRealization[];
  readonly phonemizedPronunciation: PhonemizedPronunciation;
  readonly forcedAlignment: ForcedAlignmentResult;
  readonly syllableAlignment: PronunciationAlignment;
  readonly quality: AlignmentQualityReport;
  readonly toneAnalysis: PronunciationToneAnalysis;
}

export type PronunciationAnalysisResponse =
  | {
      readonly success: true;
      readonly analysis: PronunciationAnalysisResult;
    }
  | {
      readonly success: false;
      readonly error: PronunciationAnalysisError;
    };

function failure(
  error: PronunciationAnalysisError,
): PronunciationAnalysisResponse {
  return {
    success: false,
    error,
  };
}

/**
 * Analyzes pitch contours and assesses individual syllable tones.
 *
 * Tone assessment is performed only when forced alignment
 * has passed the alignment quality checks.
 */
function analyzeTone(
  waveform: Float32Array,
  syllableAlignment: PronunciationAlignment,
  syllableRealizations: readonly PronunciationSyllableRealization[],
  quality: AlignmentQualityReport,
): PronunciationToneAnalysis {
  if (quality.status !== "accepted") {
    const reason =
      quality.status === "rejected"
        ? "alignment-rejected"
        : quality.status === "low-confidence"
          ? "alignment-low-confidence"
          : "alignment-insufficient-data";

    return {
      status: "skipped",
      reason,
    };
  }

  try {
    // The audio decoder always returns mono 16 kHz audio.
    const pitchFrames = detectPitch(waveform, 16_000);

    const pitchAnalysis = analyzeSyllablePitch(
      pitchFrames,
      syllableAlignment.syllables,
    );

    const syllableAssessments = pitchAnalysis.syllables.map(
      (contour) => {
        const realization =
          syllableRealizations[contour.syllableIndex];

        if (!realization) {
          throw new Error(
            `Missing tone realization for syllable ${contour.syllableIndex}.`,
          );
        }

        return assessSyllableTone(
          contour,
          realization.surfaceTone,
        );
      },
    );

    return {
      status: "completed",
      pitchAnalysis,
      syllableAssessments,
    };
  } catch (error) {
    return {
      status: "failed",
      message:
        error instanceof Error
          ? error.message
          : "Tone analysis could not be completed.",
    };
  }
}

/**
 * Analyzes a recording of one vocabulary word.
 *
 * The service coordinates domain logic and infrastructure:
 * - resolves lexical and surface tones,
 * - converts the selected reading into Charsiu phones,
 * - decodes the recording into mono 16 kHz audio,
 * - performs forced alignment,
 * - maps aligned frames to syllables,
 * - evaluates alignment quality,
 * - extracts pitch contours,
 * - assesses individual syllable tones.
 *
 * Alignment quality is not a pronunciation score.
 * Tone assessment is a separate heuristic analysis.
 */
export async function analyzeWordPronunciation(
  word: string,
  pinyin: string,
  recording: Blob,
): Promise<PronunciationAnalysisResponse> {
  if (!word.trim()) {
    return failure({
      stage: "tone-realization",
      code: "INVALID_CHARACTER_ALIGNMENT",
      message: "The vocabulary word cannot be empty.",
    });
  }

  const toneResult = realizeWordPronunciation(word, pinyin);

  if (!toneResult.success) {
    return failure({
      stage: "tone-realization",
      code: toneResult.error.code,
      message: toneResult.error.message,
    });
  }

  // Model initialization and audio decoding are independent operations.
  // Run them concurrently to avoid unnecessary waiting.
  const [modelResult, audioResult] = await Promise.allSettled([
    getCharsiuModel(),
    decodeRecordingToMono16k(recording),
  ]);

  if (modelResult.status === "rejected") {
    return failure({
      stage: "model-loading",
      code: "MODEL_UNAVAILABLE",
      message:
        modelResult.reason instanceof Error
          ? modelResult.reason.message
          : "The Charsiu model could not be loaded.",
    });
  }

  if (audioResult.status === "rejected") {
    const error = audioResult.reason;

    if (error instanceof AudioDecodingError) {
      return failure({
        stage: "audio-decoding",
        code: error.code,
        message: error.message,
      });
    }

    return failure({
      stage: "audio-decoding",
      code: "INVALID_AUDIO",
      message:
        error instanceof Error
          ? error.message
          : "The recording could not be decoded.",
    });
  }

  const model = modelResult.value;
  const waveform = audioResult.value;

  const phonemizationResult = phonemizePronunciation(
    toneResult.syllables,
    model.phoneVocabulary,
  );

  if (!phonemizationResult.success) {
    return failure({
      stage: "phonemization",
      ...phonemizationResult.error,
    });
  }

  const phonemizedPronunciation =
    phonemizationResult.pronunciation;

  const forcedAlignmentResult = await alignRecordingToPronunciation(
    waveform,
    phonemizedPronunciation,
  );

  if (!forcedAlignmentResult.success) {
    return failure({
      stage: "forced-alignment",
      ...forcedAlignmentResult.error,
    });
  }

  const forcedAlignment = forcedAlignmentResult.alignment;

  const syllableAlignmentResult = mapAlignmentToSyllables(
    forcedAlignment,
    phonemizedPronunciation,
  );

  if (!syllableAlignmentResult.success) {
    return failure({
      stage: "syllable-alignment",
      ...syllableAlignmentResult.error,
    });
  }

  const syllableAlignment = syllableAlignmentResult.alignment;

  let quality: AlignmentQualityReport;

  try {
    quality = evaluateAlignmentQuality(
      forcedAlignment,
      phonemizedPronunciation,
      syllableAlignment,
    );
  } catch (error) {
    return failure({
      stage: "quality-assessment",
      code: "QUALITY_EVALUATION_FAILED",
      message:
        error instanceof Error
          ? error.message
          : "Alignment quality could not be evaluated.",
    });
  }

  const toneAnalysis = analyzeTone(
    waveform,
    syllableAlignment,
    toneResult.syllables,
    quality,
  );

  return {
    success: true,
    analysis: {
      word,
      pinyin,
      syllableRealizations: toneResult.syllables,
      phonemizedPronunciation,
      forcedAlignment,
      syllableAlignment,
      quality,
      toneAnalysis,
    },
  };
}
