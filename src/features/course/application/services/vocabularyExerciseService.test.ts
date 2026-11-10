import { describe, expect, it } from "vitest";
import type { ResolvedLessonItem } from "./lessonContentService";
import { generateVocabularyExercise } from "./vocabularyExerciseService";

type VocabularyItem = Extract<ResolvedLessonItem, { kind: "vocabulary" }>;

function createVocabularyItem(
  id: string,
  simplified: string,
  meaning: string,
): VocabularyItem {
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
          sourcePinyin: "hao3",
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

const vocabulary: VocabularyItem[] = [
  createVocabularyItem("1", "我", "ja"),
  createVocabularyItem("2", "你", "ty"),
  createVocabularyItem("3", "好", "dobry"),
  createVocabularyItem("4", "叫", "nazywać"),
  createVocabularyItem("5", "名字", "imię"),
  createVocabularyItem("6", "是", "być"),
];

describe("generateVocabularyExercise", () => {
  it("generates a question for every eligible vocabulary item", () => {
    const questions = generateVocabularyExercise(vocabulary, {
      random: () => 0.5,
    });

    expect(questions).toHaveLength(vocabulary.length);

    const questionIds = questions.map((question) => question.item.id);
    expect(new Set(questionIds).size).toBe(vocabulary.length);
  });

  it("includes the correct answer in every question", () => {
    const questions = generateVocabularyExercise(vocabulary, {
      random: () => 0.5,
    });

    for (const question of questions) {
      const correctChoice = question.choices.find(
        (choice) => choice.id === question.correctChoiceId,
      );

      expect(correctChoice).toBeDefined();
    }
  });

  it("does not generate duplicate answer meanings", () => {
    const questions = generateVocabularyExercise(vocabulary, {
      random: () => 0.5,
    });

    for (const question of questions) {
      const meanings = question.choices.map((choice) =>
        choice.text.trim().toLocaleLowerCase(),
      );

      expect(new Set(meanings).size).toBe(meanings.length);
    }
  });

  it("limits the number of choices to the configured value", () => {
    const questions = generateVocabularyExercise(vocabulary, {
      choiceCount: 3,
      random: () => 0.5,
    });

    for (const question of questions) {
      expect(question.choices).toHaveLength(3);
    }
  });

  it("generates questions only for items from the current round", () => {
    const currentRound = vocabulary.slice(0, 3);

    const questions = generateVocabularyExercise(currentRound, {
      random: () => 0.5,
    });

    expect(questions).toHaveLength(3);

    const questionIds = questions.map((question) => question.item.id);

    expect(questionIds).toEqual(
      expect.arrayContaining(currentRound.map((item) => item.reference.id)),
    );
  });

  it("uses the complete vocabulary as distractors for a single remaining word", () => {
    const remainingWord = vocabulary.slice(0, 1);

    const questions = generateVocabularyExercise(remainingWord, {
      distractorItems: vocabulary,
      random: () => 0.5,
    });

    expect(questions).toHaveLength(1);
    expect(questions[0]?.choices).toHaveLength(4);
    expect(questions[0]?.correctChoiceId).toBe("1");
  });

  it("returns no questions when fewer than two distinct meanings are available", () => {
    const items = [
      createVocabularyItem("1", "我", "ja"),
      createVocabularyItem("2", "你", "ja"),
    ];

    const questions = generateVocabularyExercise(items);

    expect(questions).toHaveLength(0);
  });

  it("returns no questions for an empty vocabulary list", () => {
    const questions = generateVocabularyExercise([]);

    expect(questions).toHaveLength(0);
  });
});
