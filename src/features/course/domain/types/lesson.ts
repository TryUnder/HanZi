import type { LearningItemReference } from "../../../learning/domain/types";

export type LessonActivityType =
  | "vocabulary"
  | "pronunciation"
  | "writing"
  | "listening"
  | "review"
  | "grammar";

export interface LessonActivity {
  readonly id: string;
  readonly type: LessonActivityType;
  readonly title: string;
  readonly description: string;
}

export interface GrammarExample {
  readonly chinese: string;
  readonly pinyin: string;
  readonly translation: string;
  readonly explanation?: string;
}

export interface GrammarPoint {
  readonly id: string;
  readonly title: string;
  readonly structure?: string;
  readonly explanation: string;
  readonly examples: readonly GrammarExample[];
  readonly notes?: readonly string[];
}

export interface Lesson {
  readonly id: string;
  readonly courseId: string;
  readonly order: number;
  readonly title: string;
  readonly description: string;
  readonly items: readonly LearningItemReference[];
  readonly activities: readonly LessonActivity[];
  readonly grammar?: readonly GrammarPoint[];
}
