export type SyllablePitchStatus = "analyzed" | "insufficient-data";

export interface SyllablePitchPoint {
  readonly timeSeconds: number;
  readonly relativePosition: number;
  readonly frequencyHz: number;
  readonly semitonesFromReference: number;
  readonly clarity: number;
}

export interface SyllablePitchContour {
  readonly syllableIndex: number;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly durationSeconds: number;
  readonly status: SyllablePitchStatus;
  readonly points: readonly SyllablePitchPoint[];
  readonly voicedFrameCount: number;
  readonly availableFrameCount: number;
  readonly voicedRatio: number;
  readonly medianFrequencyHz: number | null;
  readonly minimumFrequencyHz: number | null;
  readonly maximumFrequencyHz: number | null;
}

export interface WordPitchAnalysis {
  readonly status: SyllablePitchStatus;
  readonly referenceFrequencyHz: number | null;
  readonly syllables: readonly SyllablePitchContour[];
}
