import { describe, expect, it } from "vitest";
import type { ResolvedLessonItem } from "./lessonContentService";
import { generateVocabularyExercise } from "./vocabularyExerciseService";

function createVocabularyItem(
  id: string,
  simplified: string,
  meaning: string,
): ResolvedLessonItem {
  return {
    kind: "vocabulary",
    reference: {
      kind: "vocabulary",
      id,
    },
    data: {
      id,
      simplified,
      traditionalVariants: [],
      hskLevels: [1],
      readings: [
        {
          pinyin: "hǎo",
          definitions: [meaning],
          traditionalForms: [],
        },
      ],
      meanings: [meaning],
      examples: [],
      notes: [],
      isVerified: true,
      audioUrl: null,
    },
  };
}

const vocabulary = [
  createVocabularyItem("1", "我", "ja"),
  createVocabularyItem("2", "你", "ty"),
  createVocabularyItem("3", "好", "dobry"),
  createVocabularyItem("4", "谢谢", "dziękuję"),
  createVocabularyItem("5", "再见", "do widzenia"),
  createVocabularyItem("6", "老师", "nauczyciel"),
];

describe("generateVocabularyExercise", () => {
  it("generates five unique questions by default", () => {
    const questions = generateVocabularyExercise(vocabulary, {
      random: () => 0.5,
    });

    expect(questions).toHaveLength(5);

    const questionIds = questions.map((question) => question.id);

    expect(new Set(questionIds).size).toBe(5);
  });

  it("includes the correct answer in every question", () => {
    const questions = generateVocabularyExercise(vocabulary, {
      random: () => 0.5,
    });

    for (const question of questions) {
      expect(
        question.choices.some(
          (choice) => choice.id === question.correctChoiceId,
        ),
      ).toBe(true);
    }
  });

  it("does not generate duplicate answer meanings", () => {
    const questions = generateVocabularyExercise(vocabulary, {
      random: () => 0.5,
    });

    for (const question of questions) {
      const meanings = question.choices.map((choice) =>
        choice.text.toLocaleLowerCase(),
      );

      expect(new Set(meanings).size).toBe(meanings.length);
    }
  });

  it("limits the number of choices", () => {
    const questions = generateVocabularyExercise(vocabulary, {
      choiceCount: 3,
      random: () => 0.5,
    });

    for (const question of questions) {
      expect(question.choices.length).toBeLessThanOrEqual(3);
    }
  });

  it("returns no questions when fewer than two meanings are available", () => {
    const questions = generateVocabularyExercise(
      [createVocabularyItem("1", "我", "ja")],
      { random: () => 0.5 },
    );

    expect(questions).toHaveLength(0);
  });

  it("returns no questions for an empty vocabulary list", () => {
    expect(generateVocabularyExercise([])).toEqual([]);
  });
});
