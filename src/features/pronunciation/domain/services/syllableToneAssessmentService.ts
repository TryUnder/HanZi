import type { SyllablePitchContour } from "../models/syllablePitchContour";
import type {
  AssessedMandarinTone,
  SyllableToneAssessment,
  SyllableToneFeatures,
  SyllableToneFeedbackCode,
} from "../models/syllableToneAssessment";

export interface SyllableToneAssessmentOptions {
  readonly minimumDurationSeconds?: number;
  readonly minimumPoints?: number;
  readonly minimumConfidence?: number;
  readonly matchedScoreThreshold?: number;
  readonly improvementScoreThreshold?: number;
}

interface ResolvedOptions {
  readonly minimumDurationSeconds: number;
  readonly minimumPoints: number;
  readonly minimumConfidence: number;
  readonly matchedScoreThreshold: number;
  readonly improvementScoreThreshold: number;
}

interface ToneEvaluation {
  readonly score: number;
  readonly feedbackCode: SyllableToneFeedbackCode;
}

const DEFAULT_OPTIONS: ResolvedOptions = {
  minimumDurationSeconds: 0.18,
  minimumPoints: 6,
  minimumConfidence: 0.45,
  matchedScoreThreshold: 70,
  improvementScoreThreshold: 45,
};

function resolveOptions(
  options: SyllableToneAssessmentOptions,
): ResolvedOptions {
  const resolved = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  if (
    !Number.isFinite(resolved.minimumDurationSeconds) ||
    resolved.minimumDurationSeconds <= 0 ||
    !Number.isInteger(resolved.minimumPoints) ||
    resolved.minimumPoints < 3 ||
    !Number.isFinite(resolved.minimumConfidence) ||
    resolved.minimumConfidence < 0 ||
    resolved.minimumConfidence > 1 ||
    !Number.isFinite(resolved.matchedScoreThreshold) ||
    !Number.isFinite(resolved.improvementScoreThreshold) ||
    resolved.improvementScoreThreshold < 0 ||
    resolved.matchedScoreThreshold > 100 ||
    resolved.improvementScoreThreshold >= resolved.matchedScoreThreshold
  ) {
    throw new Error("Invalid syllable tone assessment configuration.");
  }

  return resolved;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((first, second) => first - second);

  const middleIndex = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middleIndex]!;
  }

  return (sorted[middleIndex - 1]! + sorted[middleIndex]!) / 2;
}

function medianInPositionRange(
  values: readonly number[],
  points: SyllablePitchContour["points"],
  minimumPosition: number,
  maximumPosition: number,
): number {
  const selected = values.filter((_, index) => {
    const position = points[index]!.relativePosition;

    return position >= minimumPosition && position <= maximumPosition;
  });

  return selected.length > 0 ? median(selected) : median(values);
}

function calculateRegressionSlope(
  points: SyllablePitchContour["points"],
): number {
  const meanX =
    points.reduce((sum, point) => sum + point.relativePosition, 0) /
    points.length;

  const meanY =
    points.reduce((sum, point) => sum + point.semitonesFromReference, 0) /
    points.length;

  let numerator = 0;
  let denominator = 0;

  for (const point of points) {
    const differenceX = point.relativePosition - meanX;
    const differenceY = point.semitonesFromReference - meanY;

    numerator += differenceX * differenceY;
    denominator += differenceX * differenceX;
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

function calculateDirectionConsistency(
  points: SyllablePitchContour["points"],
  direction: "rising" | "falling",
): number {
  let relevantChanges = 0;
  let matchingChanges = 0;

  for (let index = 1; index < points.length; index += 1) {
    const difference =
      points[index]!.semitonesFromReference -
      points[index - 1]!.semitonesFromReference;

    if (Math.abs(difference) < 0.01) {
      continue;
    }

    relevantChanges += 1;

    if (
      (direction === "rising" && difference > 0) ||
      (direction === "falling" && difference < 0)
    ) {
      matchingChanges += 1;
    }
  }

  return relevantChanges === 0 ? 0 : matchingChanges / relevantChanges;
}

function extractFeatures(contour: SyllablePitchContour): SyllableToneFeatures {
  const points = contour.points;
  const values = points.map((point) => point.semitonesFromReference);

  const startMedianSemitones = medianInPositionRange(values, points, 0, 0.25);

  const middleMedianSemitones = medianInPositionRange(
    values,
    points,
    0.35,
    0.65,
  );

  const endMedianSemitones = medianInPositionRange(values, points, 0.75, 1);

  const minimumSemitones = Math.min(...values);
  const maximumSemitones = Math.max(...values);

  return {
    startMedianSemitones,
    middleMedianSemitones,
    endMedianSemitones,
    minimumSemitones,
    maximumSemitones,
    pitchRangeSemitones: maximumSemitones - minimumSemitones,
    startToEndChangeSemitones: endMedianSemitones - startMedianSemitones,
    regressionSlope: calculateRegressionSlope(points),
    directionConsistency: calculateDirectionConsistency(
      points,
      endMedianSemitones >= startMedianSemitones ? "rising" : "falling",
    ),
  };
}

function clampScore(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

function evaluateLevelTone(features: SyllableToneFeatures): ToneEvaluation {
  const instability =
    Math.max(0, features.pitchRangeSemitones - 1.5) * 12 +
    Math.abs(features.regressionSlope) * 5;

  return {
    score: clampScore(100 - instability),
    feedbackCode: instability <= 30 ? "STABLE_CONTOUR" : "UNSTABLE_CONTOUR",
  };
}

function evaluateRisingTone(features: SyllableToneFeatures): ToneEvaluation {
  const rise = features.startToEndChangeSemitones;

  const riseScore = Math.max(0, Math.min(1, rise / 3)) * 65;

  const consistencyScore = features.directionConsistency * 35;

  return {
    score: clampScore(riseScore + consistencyScore),
    feedbackCode:
      rise >= 1.5 && features.directionConsistency >= 0.55
        ? "RISING_CONTOUR"
        : "UNSTABLE_CONTOUR",
  };
}

function evaluateFallingTone(features: SyllableToneFeatures): ToneEvaluation {
  const fall = -features.startToEndChangeSemitones;

  const fallScore = Math.max(0, Math.min(1, fall / 3)) * 65;

  const consistencyScore = features.directionConsistency * 35;

  return {
    score: clampScore(fallScore + consistencyScore),
    feedbackCode:
      fall >= 1.5 && features.directionConsistency >= 0.55
        ? "FALLING_CONTOUR"
        : "UNSTABLE_CONTOUR",
  };
}

function evaluateThirdTone(features: SyllableToneFeatures): ToneEvaluation {
  const initialFall =
    features.startMedianSemitones - features.middleMedianSemitones;

  const finalRise =
    features.endMedianSemitones - features.middleMedianSemitones;

  const lowFalling =
    features.startToEndChangeSemitones <= -1.2 && initialFall >= 0.6;

  const dipping = initialFall >= 0.8 && finalRise >= 0.4;

  if (dipping) {
    const fallScore = Math.min(1, initialFall / 2);
    const riseScore = Math.min(1, finalRise / 1.5);

    return {
      score: clampScore(fallScore * 50 + riseScore * 50),
      feedbackCode: "DIPPING_CONTOUR",
    };
  }

  if (lowFalling) {
    return {
      score: clampScore(
        Math.min(1, -features.startToEndChangeSemitones / 1.8) * 85,
      ),
      feedbackCode: "LOW_FALLING_CONTOUR",
    };
  }

  return {
    score: clampScore(
      Math.max(0, 45 - Math.abs(features.startToEndChangeSemitones) * 10),
    ),
    feedbackCode: "UNSTABLE_CONTOUR",
  };
}

function evaluateTone(
  tone: AssessedMandarinTone,
  features: SyllableToneFeatures,
): ToneEvaluation {
  switch (tone) {
    case 1:
      return evaluateLevelTone(features);
    case 2:
      return evaluateRisingTone(features);
    case 3:
      return evaluateThirdTone(features);
    case 4:
      return evaluateFallingTone(features);
    case 5:
      return {
        score: 0,
        feedbackCode: "NEUTRAL_TONE_LIMITATION",
      };
  }
}

function calculateConfidence(contour: SyllablePitchContour): number {
  const averageClarity =
    contour.points.reduce((sum, point) => sum + point.clarity, 0) /
    contour.points.length;

  const frameCoverage = Math.min(1, contour.voicedFrameCount / 12);

  return (
    Math.round(
      (contour.voicedRatio * 0.4 + averageClarity * 0.3 + frameCoverage * 0.3) *
        100,
    ) / 100
  );
}

function createInsufficientResult(
  expectedTone: AssessedMandarinTone,
): SyllableToneAssessment {
  return {
    expectedTone,
    status: "insufficient-data",
    score: null,
    confidence: 0,
    feedbackCode: "INSUFFICIENT_PITCH_DATA",
    features: null,
  };
}

/**
 * Assesses a syllable against its expected surface tone.
 *
 * This is a heuristic contour assessment, not a complete phonetic
 * pronunciation score. Neutral tone is deliberately not graded
 * from pitch contour alone.
 */
export function assessSyllableTone(
  contour: SyllablePitchContour,
  expectedTone: AssessedMandarinTone,
  customOptions: SyllableToneAssessmentOptions = {},
): SyllableToneAssessment {
  const options = resolveOptions(customOptions);

  if (!Number.isInteger(expectedTone) || expectedTone < 1 || expectedTone > 5) {
    throw new Error("Invalid expected Mandarin tone.");
  }

  if (
    contour.status !== "analyzed" ||
    contour.durationSeconds < options.minimumDurationSeconds ||
    contour.points.length < options.minimumPoints
  ) {
    return createInsufficientResult(expectedTone);
  }

  if (
    contour.points.some(
      (point) =>
        !Number.isFinite(point.relativePosition) ||
        point.relativePosition < 0 ||
        point.relativePosition > 1 ||
        !Number.isFinite(point.semitonesFromReference) ||
        !Number.isFinite(point.clarity) ||
        point.clarity < 0 ||
        point.clarity > 1,
    )
  ) {
    return createInsufficientResult(expectedTone);
  }

  const features = extractFeatures(contour);
  const confidence = calculateConfidence(contour);

  if (confidence < options.minimumConfidence) {
    return {
      expectedTone,
      status: "uncertain",
      score: null,
      confidence,
      feedbackCode: "AMBIGUOUS_CONTOUR",
      features,
    };
  }

  if (expectedTone === 5) {
    return {
      expectedTone,
      status: "limited-assessment",
      score: null,
      confidence,
      feedbackCode: "NEUTRAL_TONE_LIMITATION",
      features,
    };
  }

  const evaluation = evaluateTone(expectedTone, features);

  const status =
    evaluation.score >= options.matchedScoreThreshold
      ? "matched"
      : evaluation.score >= options.improvementScoreThreshold
        ? "needs-improvement"
        : "uncertain";

  return {
    expectedTone,
    status,
    score: evaluation.score,
    confidence,
    feedbackCode: evaluation.feedbackCode,
    features,
  };
}
