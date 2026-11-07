import type {
  StoredWritingSession,
  WritingSessionResult,
} from "../../features/writing/types/writing";

const WRITING_HISTORY_KEY = "hanzi:writing-history:v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value >= 0;
}

function isStoredWritingSession(value: unknown): value is StoredWritingSession {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.characterId) &&
    isNonEmptyString(value.character) &&
    isNonNegativeInteger(value.correctStrokes) &&
    isNonNegativeInteger(value.totalStrokes) &&
    isNonNegativeInteger(value.mistakes) &&
    value.totalStrokes > 0 &&
    value.correctStrokes <= value.totalStrokes &&
    value.correctStrokes === value.totalStrokes &&
    typeof value.completedAt === "string" &&
    Number.isFinite(Date.parse(value.completedAt))
  );
}

/**
 * Returns valid writing sessions, newest first.
 * Invalid or unavailable storage data results in an empty history.
 */
export function getWritingHistory(): StoredWritingSession[] {
  try {
    const storedValue = localStorage.getItem(WRITING_HISTORY_KEY);

    if (!storedValue) {
      return [];
    }

    const parsedValue: unknown = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter(isStoredWritingSession)
      .sort(
        (first, second) =>
          Date.parse(second.completedAt) - Date.parse(first.completedAt),
      );
  } catch {
    return [];
  }
}

/**
 * Saves a completed writing session and returns its persisted record.
 */
export function saveWritingSession(
  result: WritingSessionResult,
): StoredWritingSession {
  if (
    !isNonEmptyString(result.characterId) ||
    !isNonEmptyString(result.character) ||
    !isNonNegativeInteger(result.correctStrokes) ||
    !isNonNegativeInteger(result.totalStrokes) ||
    !isNonNegativeInteger(result.mistakes) ||
    result.totalStrokes <= 0 ||
    result.correctStrokes !== result.totalStrokes ||
    !Number.isFinite(Date.parse(result.completedAt))
  ) {
    throw new Error("Cannot save an invalid or incomplete writing session.");
  }

  const savedSession: StoredWritingSession = {
    ...result,
    id: crypto.randomUUID(),
  };

  try {
    const history = getWritingHistory();
    const updatedHistory = [savedSession, ...history];

    localStorage.setItem(WRITING_HISTORY_KEY, JSON.stringify(updatedHistory));

    return savedSession;
  } catch {
    throw new Error("Unable to save writing history to local storage.");
  }
}
