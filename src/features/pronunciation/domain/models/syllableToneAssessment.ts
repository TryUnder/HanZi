export type AssessedMandarinTone = 1 | 2 | 3 | 4 | 5;

export type SyllableToneAssessmentStatus =
  | "matched"
  | "needs-improvement"
  | "uncertain"
  | "insufficient-data"
  | "limited-assessment";

export type SyllableToneFeedbackCode =
  | "STABLE_CONTOUR"
  | "RISING_CONTOUR"
  | "FALLING_CONTOUR"
  | "DIPPING_CONTOUR"
  | "LOW_FALLING_CONTOUR"
  | "UNSTABLE_CONTOUR"
  | "INSUFFICIENT_PITCH_DATA"
  | "NEUTRAL_TONE_LIMITATION"
  | "AMBIGUOUS_CONTOUR";

export interface SyllableToneFeatures {
  readonly startMedianSemitones: number;
  readonly middleMedianSemitones: number;
  readonly endMedianSemitones: number;
  readonly minimumSemitones: number;
  readonly maximumSemitones: number;
  readonly pitchRangeSemitones: number;
  readonly startToEndChangeSemitones: number;
  readonly regressionSlope: number;
  readonly directionConsistency: number;
}

export interface SyllableToneAssessment {
  readonly expectedTone: AssessedMandarinTone;
  readonly status: SyllableToneAssessmentStatus;
  readonly score: number | null;
  readonly confidence: number;
  readonly feedbackCode: SyllableToneFeedbackCode;
  readonly features: SyllableToneFeatures | null;
}
