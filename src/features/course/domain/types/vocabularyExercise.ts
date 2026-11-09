import type { LearningItemReference } from "../../../learning/domain/types";

export interface VocabularyExerciseChoice {
  readonly id: string;
  readonly text: string;
}

export interface VocabularyExerciseQuestion {
  readonly id: string;
  readonly item: LearningItemReference;
  readonly character: string;
  readonly pinyin: string;
  readonly choices: readonly VocabularyExerciseChoice[];
  readonly correctChoiceId: string;
}
