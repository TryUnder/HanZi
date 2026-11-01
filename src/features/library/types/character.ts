export type HskLevel = 1 | 2 | 3 | 4 | 5 | 6;

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
  examples: CharacterExample[];
}
