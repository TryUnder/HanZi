import type { LearningRecord } from "../../domain/types";
import { isLearningRecord } from "../../domain/rules/learningRecordValidation";

export const LEARNING_RECORDS_STORAGE_KEY = "hanzi:learning-records";

export const LEARNING_RECORDS_STORAGE_VERSION = 1;

export interface LearningRecordStorageData {
  readonly version: typeof LEARNING_RECORDS_STORAGE_VERSION;
  readonly records: readonly LearningRecord[];
}

function isRecordCollection(value: unknown): value is LearningRecord[] {
  if (!Array.isArray(value)) {
    return false;
  }

  if (!value.every(isLearningRecord)) {
    return false;
  }

  const ids = value.map((record) => record.id);

  return new Set(ids).size === ids.length;
}

export function isLearningRecordStorageData(
  value: unknown,
): value is LearningRecordStorageData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const data = value as Record<string, unknown>;

  return (
    data.version === LEARNING_RECORDS_STORAGE_VERSION &&
    isRecordCollection(data.records)
  );
}
