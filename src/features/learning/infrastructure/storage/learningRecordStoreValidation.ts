import { isLearningRecord } from "../../domain/rules/learningRecordValidation";
import type { LearningRecord } from "../../domain/types/learningRecord";
import {
  LEARNING_RECORD_STORE_VERSION,
  type LearningRecordStore,
} from "./learningRecordStore";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasUniqueRecordIds(records: readonly LearningRecord[]): boolean {
  const ids = records.map((record) => record.id);
  return new Set(ids).size === ids.length;
}

export function isLearningRecordStore(
  value: unknown,
): value is LearningRecordStore {
  if (!isObject(value)) {
    return false;
  }

  if (
    value.schemaVersion !== LEARNING_RECORD_STORE_VERSION ||
    typeof value.revision !== "number" ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    !Array.isArray(value.records)
  ) {
    return false;
  }

  const records = value.records;

  if (!records.every(isLearningRecord)) {
    return false;
  }

  return hasUniqueRecordIds(records);
}
