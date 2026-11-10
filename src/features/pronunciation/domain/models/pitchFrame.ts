export interface PitchFrame {
  readonly timeSeconds: number;
  readonly frequencyHz: number | null;
  readonly clarity: number;
}

export interface PitchDetectionOptions {
  readonly minFrequencyHz?: number;
  readonly maxFrequencyHz?: number;
  readonly windowSize?: number;
  readonly hopSize?: number;
  readonly threshold?: number;
  readonly fallbackThreshold?: number;
  readonly minimumRms?: number;
}
