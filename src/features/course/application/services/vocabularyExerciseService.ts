import type { ResolvedLessonItem } from "./lessonContentService";
import type {
  VocabularyExerciseChoice,
  VocabularyExerciseQuestion,
} from "../../domain/types/vocabularyExercise";

interface VocabularyExerciseOptions {
  readonly choiceCount?: number;
  readonly random?: () => number;
  readonly distractorItems?: readonly ResolvedLessonItem[];
}

interface VocabularyCandidate {
  readonly id: string;
  readonly item: Extract<ResolvedLessonItem, { kind: "vocabulary" }>;
  readonly meaning: string;
  readonly pinyin: string;
}

const DEFAULT_CHOICE_COUNT = 4;

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    const current = result[index];
    const randomItem = result[randomIndex];

    if (current === undefined || randomItem === undefined) {
      continue;
    }

    result[index] = randomItem;
    result[randomIndex] = current;
  }

  return result;
}

function normalizeMeaning(meaning: string): string {
  return meaning.trim().toLocaleLowerCase();
}

function getCandidate(
  item: Extract<ResolvedLessonItem, { kind: "vocabulary" }>,
): VocabularyCandidate | null {
  const meaning =
    item.data.meanings.find((value) => value.trim().length > 0) ??
    item.data.readings
      .flatMap((reading) => reading.definitions)
      .find((value) => value.trim().length > 0);

  if (!meaning) {
    return null;
  }

  return {
    id: item.reference.id,
    item,
    meaning: meaning.trim(),
    pinyin: item.data.readings[0]?.pinyin ?? "",
  };
}

function getUniqueCandidates(
  items: readonly ResolvedLessonItem[],
): VocabularyCandidate[] {
  const candidates = items
    .filter(
      (item): item is Extract<ResolvedLessonItem, { kind: "vocabulary" }> =>
        item.kind === "vocabulary",
    )
    .map(getCandidate)
    .filter(
      (candidate): candidate is VocabularyCandidate => candidate !== null,
    );

  return [
    ...new Map(
      candidates.map((candidate) => [candidate.id, candidate]),
    ).values(),
  ];
}

function createChoices(
  correct: VocabularyCandidate,
  candidates: readonly VocabularyCandidate[],
  choiceCount: number,
  random: () => number,
): VocabularyExerciseChoice[] {
  const correctMeaning = normalizeMeaning(correct.meaning);

  const uniqueDistractors = [
    ...new Map(
      candidates
        .filter(
          (candidate) =>
            candidate.id !== correct.id &&
            normalizeMeaning(candidate.meaning) !== correctMeaning,
        )
        .map((candidate) => [normalizeMeaning(candidate.meaning), candidate]),
    ).values(),
  ];

  const selectedDistractors = shuffle(uniqueDistractors, random).slice(
    0,
    choiceCount - 1,
  );

  const choices = [
    {
      id: correct.id,
      text: correct.meaning,
    },
    ...selectedDistractors.map((candidate) => ({
      id: candidate.id,
      text: candidate.meaning,
    })),
  ];

  return shuffle(choices, random);
}

/**
 * Generates one recognition question for every eligible vocabulary item.
 *
 * Question items determine which words are tested in the current round.
 * Distractor items provide possible incorrect answers from the whole lesson.
 */
export function generateVocabularyExercise(
  items: readonly ResolvedLessonItem[],
  options: VocabularyExerciseOptions = {},
): readonly VocabularyExerciseQuestion[] {
  const choiceCount = Math.max(2, options.choiceCount ?? DEFAULT_CHOICE_COUNT);

  const random = options.random ?? Math.random;

  const questionCandidates = getUniqueCandidates(items);

  const distractorCandidates = getUniqueCandidates([
    ...items,
    ...(options.distractorItems ?? []),
  ]);

  const questions: VocabularyExerciseQuestion[] = [];

  for (const candidate of shuffle(questionCandidates, random)) {
    const choices = createChoices(
      candidate,
      distractorCandidates,
      choiceCount,
      random,
    );

    if (choices.length < 2) {
      continue;
    }

    questions.push({
      id: `vocabulary-${candidate.id}`,
      item: candidate.item.reference,
      character: candidate.item.data.simplified,
      pinyin: candidate.pinyin,
      choices,
      correctChoiceId: candidate.id,
    });
  }

  return questions;
}
