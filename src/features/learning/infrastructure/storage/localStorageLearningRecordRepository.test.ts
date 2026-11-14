import { describe, expect, it } from "vitest";
import type { LearningRecord } from "../../domain/types";
import { LearningRecordStorageError } from "./learningRecordStorageError";
import { LocalStorageLearningRecordRepository } from "./localStorageLearningRecordRepository";
import {
  LEARNING_RECORDS_STORAGE_KEY,
  LEARNING_RECORDS_STORAGE_VERSION,
} from "./learningRecordStorageSchema";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  shouldFailOnRead = false;
  shouldFailOnWrite = false;

  getItem(key: string): string | null {
    if (this.shouldFailOnRead) {
      throw new Error("Simulated read failure");
    }

    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.shouldFailOnWrite) {
      throw new Error("Simulated write failure");
    }

    this.values.set(key, value);
  }

  setRaw(key: string, value: string): void {
    this.values.set(key, value);
  }

  getRaw(key: string): string | null {
    return this.values.get(key) ?? null;
  }
}

const firstRecord: LearningRecord = {
  id: "record-001",
  item: {
    kind: "character",
    id: "ni",
  },
  occurredAt: "2026-11-07T18:00:00.000Z",
  recordType: "status-changed",
  status: "learning",
};

const secondRecord: LearningRecord = {
  id: "record-002",
  item: {
    kind: "vocabulary",
    id: "ni-hao",
  },
  occurredAt: "2026-11-07T18:05:00.000Z",
  recordType: "attempt",
  activity: "recognition",
  details: {
    isCorrect: true,
    responseTimeMs: 1200,
  },
};

function createRepository(storage = new MemoryStorage()) {
  return {
    storage,
    repository: new LocalStorageLearningRecordRepository(storage),
  };
}

describe("LocalStorageLearningRecordRepository", () => {
  it("returns an empty collection when storage is empty", async () => {
    const { repository } = createRepository();

    await expect(repository.getAll()).resolves.toEqual([]);
  });

  it("appends and retrieves a single record", async () => {
    const { repository, storage } = createRepository();

    await repository.append(firstRecord);

    await expect(repository.getAll()).resolves.toEqual([firstRecord]);

    const persisted = JSON.parse(
      storage.getRaw(LEARNING_RECORDS_STORAGE_KEY) ?? "null",
    );

    expect(persisted).toEqual({
      version: LEARNING_RECORDS_STORAGE_VERSION,
      records: [firstRecord],
    });
  });

  it("appends multiple records in one batch", async () => {
    const { repository } = createRepository();

    await repository.appendMany([firstRecord, secondRecord]);

    await expect(repository.getAll()).resolves.toEqual([
      firstRecord,
      secondRecord,
    ]);
  });

  it("returns records for a specific learning item", async () => {
    const { repository } = createRepository();

    await repository.appendMany([firstRecord, secondRecord]);

    await expect(
      repository.getByItem({
        kind: "character",
        id: "ni",
      }),
    ).resolves.toEqual([firstRecord]);
  });

  it("does not append records with duplicate IDs", async () => {
    const { repository } = createRepository();

    await repository.append(firstRecord);

    await expect(repository.append(firstRecord)).rejects.toMatchObject({
      code: "duplicate-id",
    });

    await expect(repository.getAll()).resolves.toEqual([firstRecord]);
  });

  it("rejects duplicate IDs within a batch", async () => {
    const { repository } = createRepository();

    await expect(
      repository.appendMany([firstRecord, firstRecord]),
    ).rejects.toMatchObject({
      code: "duplicate-id",
    });

    await expect(repository.getAll()).resolves.toEqual([]);
  });

  it("does not persist a partially invalid batch", async () => {
    const { repository, storage } = createRepository();

    const invalidRecord = {
      ...secondRecord,
      id: "",
    } as LearningRecord;

    await expect(
      repository.appendMany([firstRecord, invalidRecord]),
    ).rejects.toMatchObject({
      code: "invalid-record",
    });

    expect(storage.getRaw(LEARNING_RECORDS_STORAGE_KEY)).toBeNull();
  });

  it("does not overwrite existing data when a write fails", async () => {
    const { repository, storage } = createRepository();

    await repository.append(firstRecord);

    storage.shouldFailOnWrite = true;

    await expect(repository.append(secondRecord)).rejects.toMatchObject({
      code: "write-failed",
    });

    storage.shouldFailOnWrite = false;

    await expect(repository.getAll()).resolves.toEqual([firstRecord]);
  });

  it("treats an identical idempotent append as success", async () => {
    const { repository, storage } = createRepository();

    await repository.appendIdempotent(firstRecord);

    const originalStorage = storage.getRaw(LEARNING_RECORDS_STORAGE_KEY);

    await expect(
      repository.appendIdempotent(firstRecord),
    ).resolves.toBeUndefined();

    await expect(repository.getAll()).resolves.toEqual([firstRecord]);

    expect(storage.getRaw(LEARNING_RECORDS_STORAGE_KEY)).toBe(originalStorage);
  });

  it("compares nested object content independently of property order", async () => {
    const { repository } = createRepository();

    await repository.appendIdempotent(secondRecord);

    const sameRecordWithDifferentPropertyOrder: LearningRecord = {
      details: {
        responseTimeMs: 1200,
        isCorrect: true,
      },
      activity: "recognition",
      recordType: "attempt",
      occurredAt: "2026-11-07T18:05:00.000Z",
      item: {
        id: "ni-hao",
        kind: "vocabulary",
      },
      id: "record-002",
    };

    await expect(
      repository.appendIdempotent(sameRecordWithDifferentPropertyOrder),
    ).resolves.toBeUndefined();

    await expect(repository.getAll()).resolves.toEqual([secondRecord]);
  });

  it("rejects an existing ID with different content", async () => {
    const { repository } = createRepository();

    await repository.appendIdempotent(firstRecord);

    const conflictingRecord: LearningRecord = {
      ...firstRecord,
      status: "known",
    };

    await expect(
      repository.appendIdempotent(conflictingRecord),
    ).rejects.toBeInstanceOf(LearningRecordStorageError);

    await expect(
      repository.appendIdempotent(conflictingRecord),
    ).rejects.toMatchObject({
      code: "idempotency-conflict",
    });

    await expect(repository.getAll()).resolves.toEqual([firstRecord]);
  });

  it("does not persist an invalid idempotent record", async () => {
    const { repository, storage } = createRepository();

    const invalidRecord = {
      ...firstRecord,
      id: "",
    } as LearningRecord;

    await expect(
      repository.appendIdempotent(invalidRecord),
    ).rejects.toMatchObject({
      code: "invalid-record",
    });

    expect(storage.getRaw(LEARNING_RECORDS_STORAGE_KEY)).toBeNull();
  });

  it("reports invalid JSON instead of returning an empty collection", async () => {
    const { repository, storage } = createRepository();

    storage.setRaw(LEARNING_RECORDS_STORAGE_KEY, "{invalid-json");

    await expect(repository.getAll()).rejects.toMatchObject({
      code: "invalid-json",
    });
  });

  it("reports an unsupported storage version", async () => {
    const { repository, storage } = createRepository();

    storage.setRaw(
      LEARNING_RECORDS_STORAGE_KEY,
      JSON.stringify({
        version: 999,
        records: [],
      }),
    );

    await expect(repository.getAll()).rejects.toMatchObject({
      code: "unsupported-version",
    });
  });

  it("reports invalid storage data", async () => {
    const { repository, storage } = createRepository();

    storage.setRaw(
      LEARNING_RECORDS_STORAGE_KEY,
      JSON.stringify({
        version: LEARNING_RECORDS_STORAGE_VERSION,
        records: [{ id: "invalid" }],
      }),
    );

    await expect(repository.getAll()).rejects.toMatchObject({
      code: "invalid-data",
    });
  });

  it("reports storage read failures", async () => {
    const { repository, storage } = createRepository();

    storage.shouldFailOnRead = true;

    await expect(repository.getAll()).rejects.toBeInstanceOf(
      LearningRecordStorageError,
    );

    await expect(repository.getAll()).rejects.toMatchObject({
      code: "read-failed",
    });
  });

  it("does nothing when appending an empty batch", async () => {
    const { repository, storage } = createRepository();

    await expect(repository.appendMany([])).resolves.toBeUndefined();

    expect(storage.getRaw(LEARNING_RECORDS_STORAGE_KEY)).toBeNull();
  });
});
