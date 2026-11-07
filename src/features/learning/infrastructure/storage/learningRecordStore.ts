import type { LearningRecord } from "../../domain/types/learningRecord";

/**
 * Current persisted storage format version.
 *
 * Increment this version when the serialized structure changes
 * in a way that requires migration.
 */
export const LEARNING_RECORD_STORE_VERSION = 1 as const;

export interface LearningRecordStoreV1 {
  readonly schemaVersion: typeof LEARNING_RECORD_STORE_VERSION;
  readonly revision: number;
  readonly records: readonly LearningRecord[];
}

export type LearningRecordStore = LearningRecordStoreV1;
