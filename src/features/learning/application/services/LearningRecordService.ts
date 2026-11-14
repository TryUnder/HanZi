import type {
  LearningAttempt,
  LearningItemReference,
  LearningRecord,
  LearningStatus,
  LearningStatusChanged,
} from "../../domain/types";
import type { LearningRecordRepository } from "../ports/learningRecordRepository";

type NewLearningAttempt = LearningAttempt extends infer T
  ? T extends LearningAttempt
    ? Omit<T, "id" | "occurredAt">
    : never
  : never;

interface LearningRecordServiceDependencies {
  readonly generateId?: () => string;
  readonly getCurrentTimestamp?: () => string;
}

export class LearningRecordService {
  private readonly generateId: () => string;
  private readonly getCurrentTimestamp: () => string;
  private readonly repository: LearningRecordRepository;

  constructor(
    repository: LearningRecordRepository,
    dependencies: LearningRecordServiceDependencies = {},
  ) {
    this.repository = repository;
    this.generateId = dependencies.generateId ?? (() => crypto.randomUUID());
    this.getCurrentTimestamp =
      dependencies.getCurrentTimestamp ?? (() => new Date().toISOString());
  }

  /**
   * Creates an attempt record without persisting it.
   *
   * Keep the returned object when a save may need to be retried.
   * Its ID and timestamp must remain unchanged across retries.
   */
  createAttempt(attempt: NewLearningAttempt): LearningAttempt {
    return {
      ...attempt,
      id: this.generateId(),
      occurredAt: this.getCurrentTimestamp(),
    } as LearningAttempt;
  }

  /**
   * Creates a status-change record without persisting it.
   */
  createStatusChange(
    item: LearningItemReference,
    status: LearningStatus,
  ): LearningStatusChanged {
    return {
      id: this.generateId(),
      item,
      occurredAt: this.getCurrentTimestamp(),
      recordType: "status-changed",
      status,
    };
  }

  /**
   * Saves an already-created record idempotently.
   *
   * The same record object can safely be submitted again after
   * an uncertain network result.
   */
  async saveRecord(record: LearningRecord): Promise<void> {
    await this.repository.appendIdempotent(record);
  }

  /**
   * Convenience method for creating and immediately saving an attempt.
   */
  async recordAttempt(attempt: NewLearningAttempt): Promise<LearningAttempt> {
    const record = this.createAttempt(attempt);

    await this.saveRecord(record);

    return record;
  }

  /**
   * Convenience method for creating and immediately saving a status change.
   */
  async changeStatus(
    item: LearningItemReference,
    status: LearningStatus,
  ): Promise<LearningStatusChanged> {
    const record = this.createStatusChange(item, status);

    await this.saveRecord(record);

    return record;
  }

  getAllRecords(): Promise<readonly LearningRecord[]> {
    return this.repository.getAll();
  }

  getItemHistory(
    item: LearningItemReference,
  ): Promise<readonly LearningRecord[]> {
    return this.repository.getByItem(item);
  }
}
