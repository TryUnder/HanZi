
import { characters } from "../../../library/data/characters";
import {
  getVocabularyById,
  getVocabularyLearningData,
} from "../../../library/data/vocabularyLearningRepository";
import { createVocabularyDisplay } from "../../../library/domain/vocabulary/vocabularyDisplay";

import type { LearningItemReference } from "../../../learning/domain/types";

export interface StatisticsItemDisplay {
  readonly kind: LearningItemReference["kind"];
  readonly simplified: string;
  readonly traditional: string | null;
  readonly pinyin: string;
  readonly meaning: string;
  readonly hskLevels: readonly number[];
  readonly isResolved: boolean;
}

const charactersById = new Map(
  characters.map((character) => [character.id, character]),
);

function createUnknownDisplay(
  item: LearningItemReference,
): StatisticsItemDisplay {
  return {
    kind: item.kind,
    simplified:
      item.kind === "character" ? "Unknown character" : "Unknown vocabulary",
    traditional: null,
    pinyin: "",
    meaning: "No matching entry found in the library.",
    hskLevels: [],
    isResolved: false,
  };
}

function resolveCharacter(
  id: string,
): StatisticsItemDisplay | null {
  const character = charactersById.get(id);

  if (!character) {
    return null;
  }

  return {
    kind: "character",
    simplified: character.simplified,
    traditional: character.traditional ?? null,
    pinyin: character.pinyin,
    meaning: character.meaning,
    hskLevels: [character.hskLevel],
    isResolved: true,
  };
}

function resolveVocabulary(
  id: string,
): StatisticsItemDisplay | null {
  const entry = getVocabularyById(id);

  if (!entry) {
    return null;
  }

  const display = createVocabularyDisplay(
    entry,
    getVocabularyLearningData(id),
  );

  return {
    kind: "vocabulary",
    simplified: display.simplified,
    traditional: display.traditionalVariants[0] ?? null,
    pinyin: display.readings.map((reading) => reading.pinyin).join(" / "),
    meaning: display.meanings.join("; "),
    hskLevels: display.hskLevels,
    isResolved: true,
  };
}

export function resolveStatisticsItemDisplay(
  item: LearningItemReference,
): StatisticsItemDisplay {
  const resolved =
    item.kind === "character"
      ? resolveCharacter(item.id)
      : resolveVocabulary(item.id);

  return resolved ?? createUnknownDisplay(item);
}
