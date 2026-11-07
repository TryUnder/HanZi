import type { MandarinTone } from "../types/speaking";
import type { PitchNormalizationResult } from "./pitchNormalization";

export type ToneAssessmentStatus =
  "matched" | "ambiguous" | "uncertain" | "insufficient-data";

export interface ToneMatch {
  tone: MandarinTone;
  score: number;
}

export interface ToneAssessmentResult {
  status: ToneAssessmentStatus;
  matchedTone: MandarinTone | null;
  confidence: number;
  candidates: ToneMatch[];
}

interface ToneTemplate {
  tone: MandarinTone;
  getValue: (position: number) => number;
}

const MINIMUM_POINTS = 10;
const MINIMUM_DURATION = 0.25;
const MINIMUM_SCORE = 65;
const AMBIGUITY_MARGIN = 8;

const TONE_TEMPLATES: readonly ToneTemplate[] = [
  {
    tone: 1,
    getValue: () => 0.5,
  },
  {
    tone: 2,
    getValue: (position) => 0.15 + position * 0.7,
  },
  {
    tone: 3,
    getValue: (position) => {
      if (position < 0.45) {
        return 0.75 - (position / 0.45) * 0.6;
      }

      return 0.15 + ((position - 0.45) / 0.55) * 0.7;
    },
  },
  {
    tone: 4,
    getValue: (position) => 0.85 - position * 0.7,
  },
  {
    tone: 5,
    getValue: () => 0.5,
  },
];

function calculateDistance(values: number[], template: ToneTemplate): number {
  let squaredError = 0;

  for (let index = 0; index < values.length; index += 1) {
    const position = index / (values.length - 1);
    const difference = values[index]! - template.getValue(position);

    squaredError += difference * difference;
  }

  return Math.sqrt(squaredError / values.length);
}

export function assessTone(
  normalization: PitchNormalizationResult,
): ToneAssessmentResult {
  const { points, duration } = normalization;

  if (points.length < MINIMUM_POINTS || duration < MINIMUM_DURATION) {
    return {
      status: "insufficient-data",
      matchedTone: null,
      confidence: 0,
      candidates: [],
    };
  }

  const values = points.map((point) => point.normalizedPitch);

  if (
    values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)
  ) {
    return {
      status: "insufficient-data",
      matchedTone: null,
      confidence: 0,
      candidates: [],
    };
  }

  const matches = TONE_TEMPLATES.map((template) => {
    const distance = calculateDistance(values, template);

    return {
      tone: template.tone,
      score: Math.round(Math.max(0, 1 - distance) * 100),
    };
  }).sort((first, second) => second.score - first.score);

  const bestMatch = matches[0]!;
  const secondMatch = matches[1]!;

  // A low score means that none of the templates describes the contour well.
  if (bestMatch.score < MINIMUM_SCORE) {
    return {
      status: "uncertain",
      matchedTone: null,
      confidence: bestMatch.score,
      candidates: matches.slice(0, 2),
    };
  }

  // Tones 1 and 5 have the same contour template at this stage.
  // Do not pretend that contour shape alone can distinguish them.
  if (
    matches.some(
      (match) =>
        (match.tone === 1 || match.tone === 5) &&
        bestMatch.score - match.score < AMBIGUITY_MARGIN,
    )
  ) {
    const flatToneMatches = matches.filter(
      (match) =>
        (match.tone === 1 || match.tone === 5) &&
        bestMatch.score - match.score < AMBIGUITY_MARGIN,
    );

    if (flatToneMatches.length === 2) {
      return {
        status: "ambiguous",
        matchedTone: null,
        confidence: bestMatch.score,
        candidates: flatToneMatches,
      };
    }
  }

  if (bestMatch.score - secondMatch.score < AMBIGUITY_MARGIN) {
    return {
      status: "ambiguous",
      matchedTone: null,
      confidence: bestMatch.score,
      candidates: matches.filter(
        (match) => bestMatch.score - match.score < AMBIGUITY_MARGIN,
      ),
    };
  }

  return {
    status: "matched",
    matchedTone: bestMatch.tone,
    confidence: bestMatch.score,
    candidates: matches.slice(0, 2),
  };
}
