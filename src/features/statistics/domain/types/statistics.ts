
import type {
  FlashcardRating,
  LearningActivity,
  LearningItemReference,
  LearningStatus,
} from "../../../learning/domain/types";

export interface ActivityStatistics {
  readonly activity: LearningActivity;
  readonly attemptCount: number;

  /**
   * Ratio of successful outcomes to measurable outcomes.
   * Null when the activity does not provide objective accuracy.
   */
  readonly accuracyRate: number | null;

  readonly measuredSuccesses: number;
  readonly measuredTotal: number;
  readonly averageResponseTimeMs: number | null;
  readonly flashcardRatings: Readonly<Record<FlashcardRating, number>>;
}

export interface ItemActivityStatistics {
  readonly activity: LearningActivity;
  readonly attemptCount: number;
}

export interface VocabularyRecognitionStatistics {
  readonly exerciseType: "vocabulary-recognition";
  readonly attemptCount: number;
  readonly correctCount: number;
  readonly incorrectCount: number;
  readonly accuracyRate: number;
  readonly difficultyRate: number;
  readonly averageResponseTimeMs: number | null;
  readonly lastAttemptAt: string;
}

export interface VocabularyWritingStatistics {
  readonly exerciseType: "writing-practice" | "memory-writing";
  readonly attemptCount: number;
  readonly perfectAttemptCount: number;
  readonly imperfectAttemptCount: number;
  readonly perfectAttemptRate: number;
  readonly correctStrokes: number;
  readonly totalStrokes: number;
  readonly strokeAccuracyRate: number | null;
  readonly difficultyRate: number | null;
  readonly lastAttemptAt: string;
}

export type ExerciseItemStatistics =
  | VocabularyRecognitionStatistics
  | VocabularyWritingStatistics;

export interface ItemStatistics {
  readonly item: LearningItemReference;
  readonly attemptCount: number;
  readonly lastAttemptAt: string | null;
  readonly latestStatus: LearningStatus | null;
  readonly activities: readonly ItemActivityStatistics[];

  /**
   * Separate statistics for each vocabulary exercise type.
   * The same vocabulary item can have multiple entries.
   */
  readonly exerciseStatistics: readonly ExerciseItemStatistics[];
}

export interface DailyActivityStatistics {
  /** UTC date in YYYY-MM-DD format. */
  readonly date: string;
  readonly attemptCount: number;
  readonly activities: Readonly<Partial<Record<LearningActivity, number>>>;
}

export interface LearningOverviewStatistics {
  readonly recordCount: number;
  readonly attemptCount: number;
  readonly statusChangeCount: number;
  readonly distinctItemCount: number;
  readonly trackedSessionCount: number;
  readonly firstActivityAt: string | null;
  readonly lastActivityAt: string | null;
}

export interface LearningStatistics {
  readonly overview: LearningOverviewStatistics;
  readonly activities: readonly ActivityStatistics[];
  readonly items: readonly ItemStatistics[];
  readonly dailyActivity: readonly DailyActivityStatistics[];
}
