export type LearningRecordStorageErrorCode =
  | "read-failed"
  | "write-failed"
  | "invalid-json"
  | "invalid-data"
  | "unsupported-version"
  | "invalid-record"
  | "duplicate-id"
  | "idempotency-conflict";

export class LearningRecordStorageError extends Error {
  public readonly code: LearningRecordStorageErrorCode;

  constructor(
    code: LearningRecordStorageErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);

    this.name = "LearningRecordStorageError";
    this.code = code;
  }
}
