import type { MandarinTone } from "./pronunciationSyllable";
import type { PronunciationSyllable } from "./pronunciationSyllable";

export type ToneSandhiRule =
  "third-tone-sandhi" | "yi-tone-sandhi" | "bu-tone-sandhi";

export interface PronunciationSyllableRealization {
  readonly syllable: PronunciationSyllable;
  readonly surfaceTone: MandarinTone;
  readonly appliedRules: readonly ToneSandhiRule[];
}
