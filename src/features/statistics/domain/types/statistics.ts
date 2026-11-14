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

export interface ItemStatistics {
  readonly item: LearningItemReference;
  readonly attemptCount: number;

  /**
   * Combined difficulty indicator based on recorded errors
   * and self-assessed flashcard difficulty.
   * Higher values indicate greater difficulty.
   */
  readonly difficultyRate: number | null;

  readonly lastAttemptAt: string | null;
  readonly latestStatus: LearningStatus | null;

  readonly activities: readonly ItemActivityStatistics[];
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
