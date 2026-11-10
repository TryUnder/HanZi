export interface TargetPhoneme {
  /** Phoneme label used by the Charsiu Mandarin model. */
  readonly symbol: string;

  /** Numeric ID of the phoneme in vocab_zh.json. */
  readonly vocabularyId: number;

  /** Index of the pronunciation syllable this phoneme belongs to. */
  readonly syllableIndex: number;

  /** Position of this phoneme within its syllable. */
  readonly positionInSyllable: number;
}

/**
 * A pronunciation converted into the exact phone sequence expected
 * by the forced-alignment model.
 *
 * The syllable count and per-phone syllable indexes preserve the
 * relationship between model output and the original Pinyin reading.
 */
export interface PhonemizedPronunciation {
  readonly syllables: number;
  readonly phonemes: readonly TargetPhoneme[];
  readonly phoneIds: readonly number[];
}
