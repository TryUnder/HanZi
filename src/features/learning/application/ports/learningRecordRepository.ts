import type { LearningItemReference, LearningRecord } from "../../domain/types";

export interface LearningRecordRepository {
  getAll(): Promise<readonly LearningRecord[]>;

  getByItem(item: LearningItemReference): Promise<readonly LearningRecord[]>;

  /**
   * Appends a record and rejects any existing ID.
   */
  append(record: LearningRecord): Promise<void>;

  /**
   * Appends records atomically and rejects any existing ID.
   */
  appendMany(records: readonly LearningRecord[]): Promise<void>;

  /**
   * Appends a record idempotently.
   *
   * An existing ID with identical content is treated as success.
   * An existing ID with different content is rejected.
   */
  appendIdempotent(record: LearningRecord): Promise<void>;
}
