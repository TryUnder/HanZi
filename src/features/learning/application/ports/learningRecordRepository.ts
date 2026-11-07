import type { LearningItemReference, LearningRecord } from "../../domain/types";

/**
 * Persistence contract for learning records.
 *
 * Implementations may use localStorage, IndexedDB or a remote API.
 * The application layer does not depend on the underlying storage.
 */
export interface LearningRecordRepository {
  /**
   * Returns all learning records.
   */
  getAll(): Promise<readonly LearningRecord[]>;

  /**
   * Returns records associated with a specific learning item.
   */
  getByItem(item: LearningItemReference): Promise<readonly LearningRecord[]>;

  /**
   * Appends a single record.
   *
   * Implementations must reject records with an ID that already exists.
   */
  append(record: LearningRecord): Promise<void>;

  /**
   * Appends multiple records atomically.
   *
   * If any record is invalid or has a duplicate ID,
   * no records from the batch may be persisted.
   */
  appendMany(records: readonly LearningRecord[]): Promise<void>;
}
