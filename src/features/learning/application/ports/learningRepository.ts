import type { LearningItemReference } from "../../domain/types/learningItem";
import type { LearningRecord } from "../../domain/types/learningRecord";

/**
 * Persistence contract for immutable learning records.
 *
 * Implementations may use localStorage, IndexedDB or a remote data source.
 */
export interface LearningRepository {
  /**
   * Returns all records in chronological order (oldest first).
   */
  getAll(): Promise<readonly LearningRecord[]>;

  /**
   * Returns records associated with the specified learning item.
   * Results are ordered chronologically (oldest first).
   */
  getByItem(item: LearningItemReference): Promise<readonly LearningRecord[]>;

  /**
   * Appends one immutable record.
   *
   * Re-appending an identical record ID and payload is an idempotent no-op.
   * Reusing an existing ID with a different payload must fail.
   */
  append(record: LearningRecord): Promise<void>;

  /**
   * Appends a batch atomically.
   *
   * Either all new records are persisted or none are.
   * Duplicate IDs inside the batch must be rejected.
   */
  appendMany(records: readonly LearningRecord[]): Promise<void>;
}
