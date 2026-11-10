export type MandarinTone = 1 | 2 | 3 | 4 | 5;

export interface PronunciationSyllable {
  /**
   * Pinyin syllable without its tone number.
   * Example: "ni", "hao", "lü".
   */
  readonly pinyin: string;

  /**
   * Lexical tone from the vocabulary source.
   * This value must never be overwritten by tone sandhi.
   */
  readonly lexicalTone: MandarinTone;

  /**
   * Whether the syllable carries neutral tone.
   */
  readonly isNeutralTone: boolean;

  /**
   * Whether the syllable is pronounced with erhua.
   */
  readonly erhua: boolean;
}
