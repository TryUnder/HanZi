import type {
  LearningRecord,
  LearningStatus,
  ListeningExerciseMode,
  MandarinTone,
  ToneAssessmentStatus,
} from "../types";

type UnknownRecord = Record<string, unknown>;

const LEARNING_STATUSES: readonly LearningStatus[] = [
  "learning",
  "known",
  "needs-practice",
  "not-learning",
];

const TONES: readonly MandarinTone[] = [1, 2, 3, 4, 5];

const LISTENING_MODES: readonly ListeningExerciseMode[] = [
  "character",
  "pinyin",
  "tone",
];

const TONE_ASSESSMENT_STATUSES: readonly ToneAssessmentStatus[] = [
  "matched",
  "ambiguous",
  "uncertain",
  "insufficient-data",
];

const FLASHCARD_RATINGS = ["again", "hard", "good", "easy"] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0;
}

function isPercentage(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

function isTone(value: unknown): value is MandarinTone {
  return TONES.some((tone) => tone === value);
}

function isValidDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    Number.isFinite(Date.parse(value))
  );
}

function isLearningItemReference(value: unknown): boolean {
  if (!isRecord(value) || !isNonEmptyString(value.id)) {
    return false;
  }

  return value.kind === "character" || value.kind === "vocabulary";
}

function isStrokeMistake(value: unknown, totalStrokes: number): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonNegativeInteger(value.strokeIndex) &&
    value.strokeIndex < totalStrokes &&
    isPositiveInteger(value.mistakes)
  );
}

function hasValidStrokeMistakes(value: unknown, totalStrokes: number): boolean {
  if (value === undefined) {
    return true;
  }

  if (!Array.isArray(value)) {
    return false;
  }

  if (!value.every((item) => isStrokeMistake(item, totalStrokes))) {
    return false;
  }

  const indexes = value.map((item) =>
    isRecord(item) ? item.strokeIndex : undefined,
  );

  return new Set(indexes).size === indexes.length;
}

function isWritingDetails(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonNegativeInteger(value.correctStrokes) &&
    isPositiveInteger(value.totalStrokes) &&
    value.correctStrokes <= value.totalStrokes &&
    isNonNegativeInteger(value.mistakes) &&
    hasValidStrokeMistakes(value.strokeMistakes, value.totalStrokes)
  );
}

function isToneCandidate(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return isTone(value.tone) && isPercentage(value.score);
}

function isSpeakingDetails(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const validStatus = TONE_ASSESSMENT_STATUSES.some(
    (status) => status === value.assessmentStatus,
  );

  const validDetectedTone =
    value.detectedTone === undefined || isTone(value.detectedTone);

  const validCandidates =
    Array.isArray(value.candidates) && value.candidates.every(isToneCandidate);

  const matchedToneRequired =
    value.assessmentStatus !== "matched" || isTone(value.detectedTone);

  return (
    isTone(value.expectedTone) &&
    validStatus &&
    validDetectedTone &&
    validCandidates &&
    matchedToneRequired &&
    isPercentage(value.confidence)
  );
}

function isListeningDetails(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const validMode = LISTENING_MODES.some((mode) => mode === value.mode);

  return (
    validMode &&
    isPositiveInteger(value.questionCount) &&
    isNonNegativeInteger(value.correctAnswers) &&
    value.correctAnswers <= value.questionCount
  );
}

function isOptionalResponseTime(value: unknown): boolean {
  return value === undefined || isNonNegativeInteger(value);
}

function isRecognitionDetails(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.isCorrect === "boolean" &&
    isOptionalResponseTime(value.responseTimeMs)
  );
}

function isFlashcardDetails(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const validRating = FLASHCARD_RATINGS.some(
    (rating) => rating === value.rating,
  );

  return validRating && isOptionalResponseTime(value.responseTimeMs);
}

export function isLearningRecord(value: unknown): value is LearningRecord {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.id) ||
    !isLearningItemReference(value.item) ||
    !isValidDate(value.occurredAt)
  ) {
    return false;
  }

  if (value.recordType === "status-changed") {
    return LEARNING_STATUSES.some((status) => status === value.status);
  }

  if (value.recordType !== "attempt" || !isRecord(value.details)) {
    return false;
  }

  switch (value.activity) {
    case "writing":
      return isWritingDetails(value.details);

    case "speaking":
      return isSpeakingDetails(value.details);

    case "listening":
      return isListeningDetails(value.details);

    case "recognition":
      return isRecognitionDetails(value.details);

    case "flashcard":
      return isFlashcardDetails(value.details);

    default:
      return false;
  }
}
