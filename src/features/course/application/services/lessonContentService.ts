import type { LearningItemReference } from "../../../learning/domain/types";
import {
  getVocabularyById,
  getVocabularyLearningData,
} from "../../../library/data/vocabularyLearningRepository";
import { createVocabularyDisplay } from "../../../library/domain/vocabulary/vocabularyDisplay";
import { characters } from "../../../library/data/characters";
import type { ChineseCharacter } from "../../../library/types/character";
import type { VocabularyDisplay } from "../../../library/domain/vocabulary/vocabularyDisplay";

export type ResolvedLessonItem =
  | {
      readonly kind: "vocabulary";
      readonly reference: Extract<
        LearningItemReference,
        { kind: "vocabulary" }
      >;
      readonly data: VocabularyDisplay;
    }
  | {
      readonly kind: "character";
      readonly reference: Extract<LearningItemReference, { kind: "character" }>;
      readonly data: ChineseCharacter;
    };

export interface LessonContentResult {
  readonly items: readonly ResolvedLessonItem[];
  readonly missingItems: readonly LearningItemReference[];
}

export function resolveLessonItems(
  references: readonly LearningItemReference[],
): LessonContentResult {
  const items: ResolvedLessonItem[] = [];
  const missingItems: LearningItemReference[] = [];

  for (const reference of references) {
    if (reference.kind === "vocabulary") {
      const entry = getVocabularyById(reference.id);

      if (!entry) {
        missingItems.push(reference);
        continue;
      }

      const learningData = getVocabularyLearningData(reference.id);

      items.push({
        kind: "vocabulary",
        reference,
        data: createVocabularyDisplay(entry, learningData),
      });

      continue;
    }

    const character = characters.find((item) => item.id === reference.id);

    if (!character) {
      missingItems.push(reference);
      continue;
    }

    items.push({
      kind: "character",
      reference,
      data: character,
    });
  }

  return { items, missingItems };
}
