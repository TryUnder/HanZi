import { characters } from "../../library/data/characters";
import type { ChineseCharacter } from "../../library/types/character";
import type {
  ListeningExerciseMode,
  ListeningQuestion,
} from "../types/speaking";

const ANSWER_OPTION_COUNT = 4;

function shuffle<T>(items: readonly T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));

    const current = shuffled[index];
    const random = shuffled[randomIndex];

    if (current === undefined || random === undefined) {
      continue;
    }

    shuffled[index] = random;
    shuffled[randomIndex] = current;
  }

  return shuffled;
}

/**
 * Returns characters that have an available audio recording.
 */
export function getAvailableListeningCharacters(): ChineseCharacter[] {
  return characters.filter(
    (character) =>
      typeof character.audioUrl === "string" &&
      character.audioUrl.trim().length > 0,
  );
}

/**
 * Returns the answer value associated with a character and exercise mode.
 */
function getCorrectAnswer(
  character: ChineseCharacter,
  mode: ListeningExerciseMode,
): string {
  switch (mode) {
    case "character":
      return character.simplified;

    case "pinyin":
      return character.pinyin;

    case "tone":
      return String(character.tone);
  }
}

/**
 * Returns all possible answer values for the selected exercise mode.
 */
function getAnswerValues(
  sourceCharacters: readonly ChineseCharacter[],
  mode: ListeningExerciseMode,
): string[] {
  if (mode === "tone") {
    return ["1", "2", "3", "4", "5"];
  }

  return [
    ...new Set(
      sourceCharacters.map((character) => getCorrectAnswer(character, mode)),
    ),
  ];
}

/**
 * Generates shuffled answer options for a single question.
 */
function generateOptions(
  correctAnswer: string,
  answerPool: readonly string[],
): string[] {
  const distractors = shuffle(
    answerPool.filter((answer) => answer !== correctAnswer),
  ).slice(0, ANSWER_OPTION_COUNT - 1);

  return shuffle([correctAnswer, ...distractors]);
}

/**
 * Generates a listening exercise from characters with audio recordings.
 *
 * Each character appears at most once in a single exercise.
 */
export function generateListeningQuestions(
  mode: ListeningExerciseMode,
  sourceCharacters: readonly ChineseCharacter[] = getAvailableListeningCharacters(),
): ListeningQuestion[] {
  const availableCharacters = sourceCharacters.filter(
    (character) =>
      typeof character.audioUrl === "string" &&
      character.audioUrl.trim().length > 0,
  );

  const answerPool = getAnswerValues(availableCharacters, mode);

  if (availableCharacters.length === 0) {
    return [];
  }

  const shuffledCharacters = shuffle(availableCharacters);

  return shuffledCharacters.map((character) => {
    const correctAnswer = getCorrectAnswer(character, mode);

    return {
      id: `${mode}-${character.id}`,
      character,
      mode,
      options: generateOptions(correctAnswer, answerPool),
      correctAnswer,
    };
  });
}
