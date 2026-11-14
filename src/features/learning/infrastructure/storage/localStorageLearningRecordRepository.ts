import type { LearningItemReference, LearningRecord } from "../../domain/types";
import type { LearningRecordRepository } from "../../application/ports/learningRecordRepository";
import { isLearningRecord } from "../../domain/rules/learningRecordValidation";
import {
  isLearningRecordStorageData,
  LEARNING_RECORDS_STORAGE_KEY,
  LEARNING_RECORDS_STORAGE_VERSION,
} from "./learningRecordStorageSchema";
import { LearningRecordStorageError } from "./learningRecordStorageError";

interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function createEmptyStorageData() {
  return {
    version: LEARNING_RECORDS_STORAGE_VERSION,
    records: [] as LearningRecord[],
  };
}

function normalizeForComparison(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeForComparison);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, normalizeForComparison(entryValue)]),
    );
  }

  return value;
}

function haveSameContent(
  first: LearningRecord,
  second: LearningRecord,
): boolean {
  return (
    JSON.stringify(normalizeForComparison(first)) ===
    JSON.stringify(normalizeForComparison(second))
  );
}

function parseStorageData(rawData: string | null): LearningRecord[] {
  if (rawData === null) {
    return createEmptyStorageData().records;
  }

  let parsedData: unknown;

  try {
    parsedData = JSON.parse(rawData);
  } catch (error) {
    throw new LearningRecordStorageError(
      "invalid-json",
      "Learning records storage contains invalid JSON.",
      { cause: error },
    );
  }

  if (
    typeof parsedData === "object" &&
    parsedData !== null &&
    !Array.isArray(parsedData) &&
    "version" in parsedData &&
    typeof parsedData.version === "number" &&
    parsedData.version !== LEARNING_RECORDS_STORAGE_VERSION
  ) {
    throw new LearningRecordStorageError(
      "unsupported-version",
      `Unsupported learning records storage version: ${parsedData.version}.`,
    );
  }

  if (!isLearningRecordStorageData(parsedData)) {
    throw new LearningRecordStorageError(
      "invalid-data",
      "Learning records storage does not match the expected schema.",
    );
  }

  return [...parsedData.records];
}

export class LocalStorageLearningRecordRepository implements LearningRecordRepository {
  private readonly storage: StorageAdapter;
  private readonly storageKey: string;

  constructor(
    storage: StorageAdapter,
    storageKey = LEARNING_RECORDS_STORAGE_KEY,
  ) {
    this.storage = storage;
    this.storageKey = storageKey;
  }

  private readRecords(): LearningRecord[] {
    let rawData: string | null;

    try {
      rawData = this.storage.getItem(this.storageKey);
    } catch (error) {
      throw new LearningRecordStorageError(
        "read-failed",
        "Unable to read learning records from storage.",
        { cause: error },
      );
    }

    return parseStorageData(rawData);
  }

  private writeRecords(records: readonly LearningRecord[]): void {
    const storageData = {
      version: LEARNING_RECORDS_STORAGE_VERSION,
      records,
    };

    try {
      this.storage.setItem(this.storageKey, JSON.stringify(storageData));
    } catch (error) {
      throw new LearningRecordStorageError(
        "write-failed",
        "Unable to persist learning records.",
        { cause: error },
      );
    }
  }

  async getAll(): Promise<readonly LearningRecord[]> {
    return this.readRecords();
  }

  async getByItem(
    item: LearningItemReference,
  ): Promise<readonly LearningRecord[]> {
    const records = this.readRecords();

    return records.filter(
      (record) => record.item.kind === item.kind && record.item.id === item.id,
    );
  }

  async append(record: LearningRecord): Promise<void> {
    await this.appendMany([record]);
  }

  async appendMany(records: readonly LearningRecord[]): Promise<void> {
    if (!Array.isArray(records)) {
      throw new LearningRecordStorageError(
        "invalid-record",
        "Expected an array of learning records.",
      );
    }

    if (records.length === 0) {
      return;
    }

    if (!records.every(isLearningRecord)) {
      throw new LearningRecordStorageError(
        "invalid-record",
        "The batch contains an invalid learning record.",
      );
    }

    const incomingIds = records.map((record) => record.id);

    if (new Set(incomingIds).size !== incomingIds.length) {
      throw new LearningRecordStorageError(
        "duplicate-id",
        "The batch contains duplicate learning record IDs.",
      );
    }

    const existingRecords = this.readRecords();
    const existingIds = new Set(existingRecords.map((record) => record.id));

    if (incomingIds.some((id) => existingIds.has(id))) {
      throw new LearningRecordStorageError(
        "duplicate-id",
        "A learning record with the same ID already exists.",
      );
    }

    this.writeRecords([...existingRecords, ...records]);
  }

  async appendIdempotent(record: LearningRecord): Promise<void> {
    if (!isLearningRecord(record)) {
      throw new LearningRecordStorageError(
        "invalid-record",
        "The learning record is invalid.",
      );
    }

    const existingRecords = this.readRecords();
    const existingRecord = existingRecords.find(
      (entry) => entry.id === record.id,
    );

    if (existingRecord) {
      if (haveSameContent(existingRecord, record)) {
        return;
      }

      throw new LearningRecordStorageError(
        "idempotency-conflict",
        "A learning record with the same ID but different content already exists.",
      );
    }

    this.writeRecords([...existingRecords, record]);
  }
}
