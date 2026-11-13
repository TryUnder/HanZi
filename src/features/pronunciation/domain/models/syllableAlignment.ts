export interface PhonemeGroupAlignment {
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly durationSeconds: number;
  readonly confidence: number;
  readonly alignedFrames: number;
  readonly firstPhoneIndex: number;
  readonly lastPhoneIndex: number;
}

export interface SyllableAlignment {
  readonly syllableIndex: number;
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly durationSeconds: number;
  readonly confidence: number;
  readonly alignedFrames: number;

  /**
   * Time interval containing the vowel/final portion of the syllable.
   * Initial consonants are deliberately excluded.
   *
   * Null means that the final received no aligned frames.
   */
  readonly finalAlignment: PhonemeGroupAlignment | null;
}

export type AlignmentStatus =
  "aligned" | "low-confidence" | "insufficient-data" | "failed";

export interface PronunciationAlignment {
  readonly status: AlignmentStatus;
  readonly durationSeconds: number;
  readonly syllables: readonly SyllableAlignment[];
  readonly averageConfidence: number;
  readonly alignedFrameCount: number;
  readonly speechFrameCount: number;
}
