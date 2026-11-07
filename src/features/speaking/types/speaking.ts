/**
 * Mandarin Chinese tones.
 *
 * Tone 5 represents the neutral tone.
 */
export type MandarinTone = 1 | 2 | 3 | 4 | 5;

/**
 * Relative pitch values used to visualize a tone.
 * Values range from 1 (low) to 5 (high).
 *
 * These are educational contours, not measured acoustic data.
 */
export type ToneContour = readonly number[];

export interface ToneDefinition {
  tone: MandarinTone;
  name: string;
  description: string;
  contour: ToneContour;
}

export interface PronunciationExample {
  id: string;
  character: string;
  pinyin: string;
  tone: MandarinTone;
  meaning: string;
  audioUrl: string | null;
}
