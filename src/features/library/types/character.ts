import type { HskLevel } from "../../../shared/domain/types/hsk";

export type { HskLevel } from "../../../shared/domain/types/hsk";

export interface CharacterExample {
  word: string;
  pinyin: string;
  meaning: string;
}

export interface ChineseCharacter {
  id: string;
  simplified: string;
  traditional?: string;
  pinyin: string;
  tone: 1 | 2 | 3 | 4 | 5;
  meaning: string;
  radical: string;
  strokes: number;
  hskLevel: HskLevel;
  audioUrl?: string | null;
  examples: CharacterExample[];
}
