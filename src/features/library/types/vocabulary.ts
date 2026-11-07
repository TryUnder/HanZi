import type { HskLevel } from "./character";

export interface VocabularyDefinitionEntry {
  traditional: string;
  definitions: string[];
}

export interface VocabularyReading {
  pinyin: string;
  sourcePinyinVariants: string[];
  entries: VocabularyDefinitionEntry[];
}

export interface VocabularyEntry {
  id: string;
  simplified: string;
  traditionalVariants: string[];
  hskLevels: HskLevel[];
  readings: VocabularyReading[];
  audioUrl: string | null;
}

export interface VocabularyExample {
  simplified: string;
  pinyin: string;
  meaning: string;
}

export type VocabularyLearningStatus = "draft" | "verified";

export interface VocabularyLearningData {
  status: VocabularyLearningStatus;
  meanings: string[];
  examples: VocabularyExample[];
  notes: string[];
}

/**
 * Sparse dataset keyed by VocabularyEntry.id.
 * Missing entries are treated as not yet reviewed.
 */
export type VocabularyLearningDataset = Record<string, VocabularyLearningData>;