export type AlignmentQualityStatus =
  "accepted" | "low-confidence" | "insufficient-data" | "rejected";

export type AlignmentQualityIssueSeverity = "warning" | "error";

export type AlignmentQualityIssueCode =
  | "MISSING_PHONEME_FRAMES"
  | "INSUFFICIENT_PHONEME_FRAMES"
  | "INSUFFICIENT_SYLLABLE_FRAMES"
  | "LOW_PHONEME_CONFIDENCE"
  | "LOW_SYLLABLE_CONFIDENCE"
  | "SYLLABLE_TOO_SHORT"
  | "SYLLABLE_TOO_LONG"
  | "EXTREME_FRAME_DISTRIBUTION";

export interface AlignmentQualityIssue {
  readonly code: AlignmentQualityIssueCode;
  readonly severity: AlignmentQualityIssueSeverity;
  readonly message: string;
  readonly syllableIndex?: number;
  readonly phonemeIndex?: number;
}

export interface PhonemeAlignmentQuality {
  readonly phonemeIndex: number;
  readonly symbol: string;
  readonly syllableIndex: number;
  readonly alignedFrames: number;
  readonly averageConfidence: number;
  readonly minimumConfidence: number | null;
}

export interface SyllableAlignmentQuality {
  readonly syllableIndex: number;
  readonly alignedFrames: number;
  readonly averageConfidence: number;
  readonly durationSeconds: number;
  readonly frameShare: number;
}

export interface AlignmentQualityReport {
  readonly status: AlignmentQualityStatus;
  readonly averageConfidence: number;
  readonly phonemes: readonly PhonemeAlignmentQuality[];
  readonly syllables: readonly SyllableAlignmentQuality[];
  readonly issues: readonly AlignmentQualityIssue[];
}
