import type { LearningItemReference } from "../../../learning/domain/types";

export type LessonActivityType =
  "vocabulary" | "pronunciation" | "writing" | "listening" | "review";

export interface LessonActivity {
  readonly id: string;
  readonly type: LessonActivityType;
  readonly title: string;
  readonly description: string;
}

export interface Lesson {
  readonly id: string;
  readonly courseId: string;
  readonly order: number;
  readonly title: string;
  readonly description: string;
  readonly items: readonly LearningItemReference[];
  readonly activities: readonly LessonActivity[];
}
