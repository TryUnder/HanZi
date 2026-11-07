import type { ChineseCharacter } from "../../library/types/character";

/**
 * Mandarin Chinese tones.
 */
export type MandarinTone = 1 | 2 | 3 | 4 | 5;

/**
 * Relative pitch values used to visualize a tone.
 */
export type ToneContour = readonly number[];

/**
 * Available speaking exercise modes.
 */
export type ListeningExerciseMode = "character" | "pinyin" | "tone";

/**
 * Shared definition of a Mandarin tone.
 */
export interface ToneDefinition {
  tone: MandarinTone;
  name: string;
  description: string;
  contour: ToneContour;
}

/**
 * Additional pronunciation examples used for tone-specific exercises.
 */
export interface PronunciationExample {
  id: string;
  character: string;
  pinyin: string;
  tone: MandarinTone;
  meaning: string;
  audioUrl: string | null;
}

/**
 * A question generated from the character library.
 */
export interface ListeningQuestion {
  id: string;
  character: ChineseCharacter;
  mode: ListeningExerciseMode;
  options: string[];
  correctAnswer: string;
}
