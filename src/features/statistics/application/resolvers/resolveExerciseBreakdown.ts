
import type { ItemStatistics } from "../../domain/types/statistics";

export type ExerciseBreakdownType =
  | "vocabulary-recognition"
  | "writing-practice"
  | "memory-writing";

export interface ExerciseBreakdownItem {
  readonly exerciseType: ExerciseBreakdownType;
  readonly title: string;
  readonly description: string;
  readonly detail: string;
  readonly attemptCount: number;
  readonly accuracyRate: number | null;
}

type ItemExerciseStatistics = Pick<ItemStatistics, "exerciseStatistics">;

interface ExerciseTotals {
  attemptCount: number;
  correctCount: number;
  incorrectCount: number;
  correctStrokes: number;
  totalStrokes: number;
}

const EXERCISE_DEFINITIONS = [
  {
    exerciseType: "vocabulary-recognition",
    title: "Vocabulary recognition",
    description: "Recognising written Chinese words",
    detail: "Answer accuracy",
  },
  {
    exerciseType: "writing-practice",
    title: "Guided writing",
    description: "Writing characters with stroke guidance",
    detail: "Stroke accuracy",
  },
  {
    exerciseType: "memory-writing",
    title: "Writing from memory",
    description: "Recalling and writing characters without hints",
    detail: "Stroke accuracy",
  },
] as const;

function createEmptyTotals(): Record<ExerciseBreakdownType, ExerciseTotals> {
  return {
    "vocabulary-recognition": {
      attemptCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      correctStrokes: 0,
      totalStrokes: 0,
    },
    "writing-practice": {
      attemptCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      correctStrokes: 0,
      totalStrokes: 0,
    },
    "memory-writing": {
      attemptCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      correctStrokes: 0,
      totalStrokes: 0,
    },
  };
}

export function resolveExerciseBreakdown(
  items: readonly ItemExerciseStatistics[],
): readonly ExerciseBreakdownItem[] {
  const totals = createEmptyTotals();

  for (const item of items) {
    for (const exercise of item.exerciseStatistics) {
      const exerciseTotals = totals[exercise.exerciseType];

      exerciseTotals.attemptCount += exercise.attemptCount;

      if (exercise.exerciseType === "vocabulary-recognition") {
        exerciseTotals.correctCount += exercise.correctCount;
        exerciseTotals.incorrectCount += exercise.incorrectCount;
        continue;
      }

      exerciseTotals.correctStrokes += exercise.correctStrokes;
      exerciseTotals.totalStrokes += exercise.totalStrokes;
    }
  }

  return EXERCISE_DEFINITIONS.map((definition) => {
    const exerciseTotals = totals[definition.exerciseType];

    const accuracyRate =
      definition.exerciseType === "vocabulary-recognition"
        ? exerciseTotals.correctCount + exerciseTotals.incorrectCount > 0
          ? exerciseTotals.correctCount /
            (exerciseTotals.correctCount + exerciseTotals.incorrectCount)
          : null
        : exerciseTotals.totalStrokes > 0
          ? exerciseTotals.correctStrokes / exerciseTotals.totalStrokes
          : null;

    return {
      ...definition,
      attemptCount: exerciseTotals.attemptCount,
      accuracyRate,
    };
  });
}
