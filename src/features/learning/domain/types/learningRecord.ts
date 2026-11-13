import type { LearningItemReference } from "./learningItem";

export type MandarinTone = 1 | 2 | 3 | 4 | 5;

export type LearningActivity =
  "writing" | "speaking" | "listening" | "recognition" | "flashcard";

export type LearningStatus =
  "learning" | "known" | "needs-practice" | "not-learning";

/**
 * Context connecting an attempt with a course activity.
 * Optional for independent learning outside courses.
 */
export interface LearningRecordContext {
  readonly courseId: string;
  readonly lessonId: string;
  readonly activityId: string;
  readonly sessionId: string;
}

export interface LearningRecordBase {
  readonly id: string;
  readonly item: LearningItemReference;
  readonly occurredAt: string;
  readonly context?: LearningRecordContext;
}

export interface StrokeMistake {
  readonly strokeIndex: number;
  readonly mistakes: number;
}

/**
 * Result of writing one Chinese character.
 */
export interface WritingCharacterResult {
  readonly character: string;
  readonly correctStrokes: number;
  readonly totalStrokes: number;
  readonly mistakes: number;
  readonly strokeMistakes?: readonly StrokeMistake[];
}

/**
 * Existing format for independent character-writing sessions.
 */
export interface CharacterWritingAttemptDetails {
  readonly correctStrokes: number;
  readonly totalStrokes: number;
  readonly mistakes: number;
  readonly strokeMistakes?: readonly StrokeMistake[];
}

/**
 * Result of writing a complete vocabulary item
 * with visible Chinese character guidance.
 */
export interface VocabularyWritingAttemptDetails {
  readonly kind: "vocabulary";
  readonly correctStrokes: number;
  readonly totalStrokes: number;
  readonly mistakes: number;
  readonly characters: readonly WritingCharacterResult[];
}

/**
 * Result of writing a complete vocabulary item from memory.
 * The prompt contains Pinyin and meaning without revealing Chinese characters.
 */
export interface MemoryWritingAttemptDetails {
  readonly kind: "memory";
  readonly correctStrokes: number;
  readonly totalStrokes: number;
  readonly mistakes: number;
  readonly characters: readonly WritingCharacterResult[];
}

export type WritingAttemptDetails =
  | CharacterWritingAttemptDetails
  | VocabularyWritingAttemptDetails
  | MemoryWritingAttemptDetails;

export type ToneAssessmentStatus =
  "matched" | "ambiguous" | "uncertain" | "insufficient-data";

export interface ToneCandidate {
  readonly tone: MandarinTone;
  readonly score: number;
}

export interface SpeakingAttemptDetails {
  readonly expectedTone: MandarinTone;
  readonly detectedTone?: MandarinTone;
  readonly assessmentStatus: ToneAssessmentStatus;
  readonly confidence: number;
  readonly candidates: readonly ToneCandidate[];
}

export type ListeningExerciseMode = "character" | "pinyin" | "tone";

export interface ListeningAttemptDetails {
  readonly mode: ListeningExerciseMode;
  readonly questionCount: number;
  readonly correctAnswers: number;
}

export interface RecognitionAttemptDetails {
  readonly isCorrect: boolean;
  readonly responseTimeMs?: number;
}

export type FlashcardRating = "again" | "hard" | "good" | "easy";

export interface FlashcardAttemptDetails {
  readonly rating: FlashcardRating;
  readonly responseTimeMs?: number;
}

export interface WritingLearningAttempt extends LearningRecordBase {
  readonly recordType: "attempt";
  readonly activity: "writing";
  readonly details: WritingAttemptDetails;
}

export interface SpeakingLearningAttempt extends LearningRecordBase {
  readonly recordType: "attempt";
  readonly activity: "speaking";
  readonly details: SpeakingAttemptDetails;
}

export interface ListeningLearningAttempt extends LearningRecordBase {
  readonly recordType: "attempt";
  readonly activity: "listening";
  readonly details: ListeningAttemptDetails;
}

export interface RecognitionLearningAttempt extends LearningRecordBase {
  readonly recordType: "attempt";
  readonly activity: "recognition";
  readonly details: RecognitionAttemptDetails;
}

export interface FlashcardLearningAttempt extends LearningRecordBase {
  readonly recordType: "attempt";
  readonly activity: "flashcard";
  readonly details: FlashcardAttemptDetails;
}

export type LearningAttempt =
  | WritingLearningAttempt
  | SpeakingLearningAttempt
  | ListeningLearningAttempt
  | RecognitionLearningAttempt
  | FlashcardLearningAttempt;

export interface LearningStatusChanged extends LearningRecordBase {
  readonly recordType: "status-changed";
  readonly status: LearningStatus;
}

export type LearningRecord = LearningAttempt | LearningStatusChanged;
