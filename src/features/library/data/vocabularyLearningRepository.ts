import vocabularyData from "./vocabulary.json";
import learningData from "./vocabulary-learning.json";

import type {
  VocabularyEntry,
  VocabularyLearningData,
  VocabularyLearningDataset,
} from "../types/vocabulary";

import { validateVocabularyLearningDataset } from "../utils/vocabularyLearningValidation";

export interface VocabularyLearningRepository {
  getAllVocabulary(): readonly VocabularyEntry[];
  getVocabularyById(id: string): VocabularyEntry | undefined;
  getVocabularyLearningData(id: string): VocabularyLearningData | undefined;
  getVocabularyByHskLevel(
    level: VocabularyEntry["hskLevels"][number],
  ): VocabularyEntry[];
  getVerifiedVocabulary(): VocabularyEntry[];
  getUnreviewedVocabulary(): VocabularyEntry[];
  getVocabularyCount(): number;
  getVerifiedVocabularyCount(): number;
}

/**
 * Creates a vocabulary repository from supplied datasets.
 * This factory also allows the repository to be tested independently
 * of the production JSON files.
 */
export function createVocabularyLearningRepository(
  vocabulary: readonly VocabularyEntry[],
  learningDataset: VocabularyLearningDataset,
): VocabularyLearningRepository {
  const validationErrors = validateVocabularyLearningDataset(
    learningDataset,
    vocabulary,
  );

  if (validationErrors.length > 0) {
    throw new Error(
      [
        "Invalid vocabulary learning dataset:",
        ...validationErrors.map((error) => `- ${error}`),
      ].join("\n"),
    );
  }

  const vocabularyById = new Map<string, VocabularyEntry>(
    vocabulary.map((entry) => [entry.id, entry]),
  );

  function getAllVocabulary(): readonly VocabularyEntry[] {
    return vocabulary;
  }

  function getVocabularyById(id: string): VocabularyEntry | undefined {
    return vocabularyById.get(id);
  }

  function getVocabularyLearningData(
    id: string,
  ): VocabularyLearningData | undefined {
    return learningDataset[id];
  }

  function getVocabularyByHskLevel(
    level: VocabularyEntry["hskLevels"][number],
  ): VocabularyEntry[] {
    return vocabulary.filter((entry) => entry.hskLevels.includes(level));
  }

  function getVerifiedVocabulary(): VocabularyEntry[] {
    return vocabulary.filter(
      (entry) => learningDataset[entry.id]?.status === "verified",
    );
  }

  function getUnreviewedVocabulary(): VocabularyEntry[] {
    return vocabulary.filter((entry) => !learningDataset[entry.id]);
  }

  function getVocabularyCount(): number {
    return vocabulary.length;
  }

  function getVerifiedVocabularyCount(): number {
    return getVerifiedVocabulary().length;
  }

  return {
    getAllVocabulary,
    getVocabularyById,
    getVocabularyLearningData,
    getVocabularyByHskLevel,
    getVerifiedVocabulary,
    getUnreviewedVocabulary,
    getVocabularyCount,
    getVerifiedVocabularyCount,
  };
}

const defaultRepository = createVocabularyLearningRepository(
  vocabularyData as VocabularyEntry[],
  learningData as VocabularyLearningDataset,
);

// Public API backed by the production datasets.

export const getAllVocabulary = defaultRepository.getAllVocabulary;
export const getVocabularyById = defaultRepository.getVocabularyById;
export const getVocabularyLearningData =
  defaultRepository.getVocabularyLearningData;
export const getVocabularyByHskLevel =
  defaultRepository.getVocabularyByHskLevel;
export const getVerifiedVocabulary = defaultRepository.getVerifiedVocabulary;
export const getUnreviewedVocabulary =
  defaultRepository.getUnreviewedVocabulary;
export const getVocabularyCount = defaultRepository.getVocabularyCount;
export const getVerifiedVocabularyCount =
  defaultRepository.getVerifiedVocabularyCount;
