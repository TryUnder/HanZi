import { useMemo, useState } from "react";
import {
  getAllVocabulary,
  getVocabularyLearningData,
  getVocabularyCount,
  getVerifiedVocabularyCount,
} from "../data/vocabularyLearningRepository";
import { createVocabularyDisplay } from "../domain/vocabulary/vocabularyDisplay";
import { matchesVocabularySearch } from "../domain/vocabulary/vocabularySearch";
import type { VocabularyDisplay } from "../domain/vocabulary/vocabularyDisplay";
import type { HskLevelFilter } from "../../../shared/domain/types/hsk";

export type VocabularyLevelFilter = HskLevelFilter;

export interface UseVocabularyResult {
  readonly search: string;
  readonly setSearch: (value: string) => void;
  readonly selectedLevel: VocabularyLevelFilter;
  readonly setSelectedLevel: (value: VocabularyLevelFilter) => void;
  readonly filteredVocabulary: readonly VocabularyDisplay[];
  readonly vocabularyCount: number;
  readonly resultCount: number;
  readonly verifiedCount: number;
  readonly unreviewedCount: number;
}

export function useVocabulary(
  defaultLevel: HskLevelFilter = "all",
): UseVocabularyResult {
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] =
    useState<VocabularyLevelFilter>(defaultLevel);

  const vocabulary = useMemo(
    () =>
      getAllVocabulary().map((entry) =>
        createVocabularyDisplay(entry, getVocabularyLearningData(entry.id)),
      ),
    [],
  );

  const filteredVocabulary = useMemo(() => {
    return vocabulary.filter((entry) => {
      const matchesLevel =
        selectedLevel === "all" || entry.hskLevels.includes(selectedLevel);

      return matchesLevel && matchesVocabularySearch(entry, search);
    });
  }, [vocabulary, search, selectedLevel]);

  const vocabularyCount = getVocabularyCount();
  const verifiedCount = getVerifiedVocabularyCount();

  return {
    search,
    setSearch,
    selectedLevel,
    setSelectedLevel,
    filteredVocabulary,
    vocabularyCount,
    resultCount: filteredVocabulary.length,
    verifiedCount,
    unreviewedCount: vocabularyCount - verifiedCount,
  };
}
