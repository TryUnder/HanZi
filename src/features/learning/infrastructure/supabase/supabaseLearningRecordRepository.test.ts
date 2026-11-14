import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  LearningRecord,
  RecognitionLearningAttempt,
} from "../../domain/types";
import {
  SupabaseLearningRecordRepository,
  SupabaseLearningRecordRepositoryError,
} from "./supabaseLearningRecordRepository";

interface QueryError {
  readonly code: string;
  readonly message: string;
}

interface QueryResult {
  readonly data: unknown;
  readonly error: QueryError | null;
}

interface LearningRecordRow {
  readonly id: string;
  readonly user_id: string;
  readonly record_type: string;
  readonly activity: string | null;
  readonly item_kind: string;
  readonly item_id: string;
  readonly occurred_at: string;
  readonly record_data: LearningRecord;
}

function createRow(record: LearningRecord): LearningRecordRow {
  return {
    id: record.id,
    user_id: "user-1",
    record_type: record.recordType,
    activity: record.recordType === "attempt" ? record.activity : null,
    item_kind: record.item.kind,
    item_id: record.item.id,
    occurred_at: record.occurredAt,
    record_data: record,
  };
}

function createRecord(overrides: Partial<LearningRecord> = {}): LearningRecord {
  return {
    id: "record-001",
    item: {
      kind: "character",
      id: "ni",
    },
    occurredAt: "2026-11-14T15:00:00.000Z",
    recordType: "status-changed",
    status: "learning",
    ...overrides,
  } as LearningRecord;
}

function createRecognitionRecord(): RecognitionLearningAttempt {
  return {
    id: "record-recognition",
    item: {
      kind: "vocabulary",
      id: "ni-hao",
    },
    occurredAt: "2026-11-14T15:00:00.000Z",
    recordType: "attempt",
    activity: "recognition",
    details: {
      isCorrect: true,
      responseTimeMs: 900,
    },
  };
}

interface RepositoryMockOptions {
  readonly initialRows?: readonly LearningRecordRow[];
  readonly firstInsertError?: QueryError;
  readonly insertError?: QueryError;
  readonly selectError?: QueryError;
}

function createRepository(options: RepositoryMockOptions = {}) {
  const rows = new Map<string, LearningRecordRow>(
    (options.initialRows ?? []).map((row) => [row.id, row]),
  );

  let insertAttempts = 0;
  let currentResult: QueryResult = {
    data: null,
    error: null,
  };

  let selectedId: string | null = null;

  const query = {
    select: vi.fn(() => {
      currentResult = {
        data: null,
        error: options.selectError ?? null,
      };

      return query;
    }),

    order: vi.fn(() => query),

    eq: vi.fn((_column: string, value: string) => {
      selectedId = value;
      return query;
    }),

    insert: vi.fn((values: unknown) => {
      insertAttempts += 1;

      const insertedValues = Array.isArray(values) ? values : [values];
      const insertedRow = insertedValues[0] as LearningRecordRow;

      if (rows.has(insertedRow.id)) {
        currentResult = {
          data: null,
          error: {
            code: "23505",
            message: "duplicate key value violates unique constraint",
          },
        };

        return query;
      }

      rows.set(insertedRow.id, insertedRow);

      const configuredError =
        insertAttempts === 1 ? options.firstInsertError : options.insertError;

      currentResult = {
        data: null,
        error: configuredError ?? null,
      };

      return query;
    }),

    maybeSingle: vi.fn(async () => {
      if (options.selectError) {
        return {
          data: null,
          error: options.selectError,
        };
      }

      return {
        data: selectedId ? (rows.get(selectedId) ?? null) : null,
        error: null,
      };
    }),

    then: (
      onFulfilled: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(currentResult).then(onFulfilled, onRejected),
  };

  const client = {
    from: vi.fn(() => query),
  } as unknown as SupabaseClient;

  return {
    repository: new SupabaseLearningRecordRepository(client),
    client,
    query,
    rows,
  };
}

describe("SupabaseLearningRecordRepository", () => {
  it("inserts a new record", async () => {
    const { repository, client, query, rows } = createRepository();
    const record = createRecord();

    await expect(repository.appendIdempotent(record)).resolves.toBeUndefined();

    expect(client.from).toHaveBeenCalledWith("learning_records");
    expect(query.insert).toHaveBeenCalledOnce();
    expect(rows.size).toBe(1);

    const insertedRow = query.insert.mock.calls[0]?.[0];

    expect(insertedRow).toMatchObject({
      id: record.id,
      record_type: "status-changed",
      activity: null,
      item_kind: "character",
      item_id: "ni",
      record_data: record,
    });

    expect(insertedRow).not.toHaveProperty("user_id");
  });

  it("treats an identical existing record as success", async () => {
    const record = createRecord();
    const { repository, query, rows } = createRepository({
      initialRows: [createRow(record)],
    });

    await expect(repository.appendIdempotent(record)).resolves.toBeUndefined();

    expect(query.insert).toHaveBeenCalledOnce();
    expect(query.select).toHaveBeenCalledWith(
      "id, user_id, record_type, activity, item_kind, item_id, occurred_at, record_data",
    );
    expect(query.eq).toHaveBeenCalledWith("id", record.id);
    expect(query.maybeSingle).toHaveBeenCalledOnce();
    expect(rows.size).toBe(1);
  });

  it("treats nested objects with different property order as identical", async () => {
    const record = createRecognitionRecord();

    const existingRecord: RecognitionLearningAttempt = {
      ...record,
      details: {
        responseTimeMs: 900,
        isCorrect: true,
      },
    };

    const { repository } = createRepository({
      initialRows: [createRow(existingRecord)],
    });

    await expect(repository.appendIdempotent(record)).resolves.toBeUndefined();
  });

  it("rejects an existing ID with different content", async () => {
    const existingRecord = createRecord();
    const conflictingRecord = createRecord({
      status: "known",
    } as Partial<LearningRecord>);

    const { repository, rows } = createRepository({
      initialRows: [createRow(existingRecord)],
    });

    await expect(
      repository.appendIdempotent(conflictingRecord),
    ).rejects.toThrow(SupabaseLearningRecordRepositoryError);

    await expect(
      repository.appendIdempotent(conflictingRecord),
    ).rejects.toThrow(
      "A learning record with the same ID but different content already exists.",
    );

    expect(rows.size).toBe(1);
    expect(rows.get(existingRecord.id)?.record_data).toEqual(existingRecord);
  });

  it("recovers when the first request commits but its response is lost", async () => {
    const record = createRecord();

    const { repository, rows, query } = createRepository({
      firstInsertError: {
        code: "08006",
        message: "Connection lost after transaction commit.",
      },
    });

    await expect(repository.appendIdempotent(record)).rejects.toThrow(
      SupabaseLearningRecordRepositoryError,
    );

    expect(rows.size).toBe(1);

    await expect(repository.appendIdempotent(record)).resolves.toBeUndefined();

    expect(query.insert).toHaveBeenCalledTimes(2);
    expect(query.maybeSingle).toHaveBeenCalledOnce();
    expect(rows.size).toBe(1);
  });

  it("does not perform a lookup for a non-duplicate insert error", async () => {
    const { repository, query } = createRepository({
      firstInsertError: {
        code: "42501",
        message: "Permission denied.",
      },
    });

    await expect(repository.appendIdempotent(createRecord())).rejects.toThrow(
      SupabaseLearningRecordRepositoryError,
    );

    expect(query.select).not.toHaveBeenCalled();
    expect(query.maybeSingle).not.toHaveBeenCalled();
  });

  it("wraps errors when checking an existing record", async () => {
    const record = createRecord();

    const { repository, query } = createRepository({
      initialRows: [createRow(record)],
      selectError: {
        code: "08006",
        message: "Database unavailable.",
      },
    });

    await expect(repository.appendIdempotent(record)).rejects.toThrow(
      "Unable to verify an existing learning record in Supabase.",
    );

    expect(query.maybeSingle).toHaveBeenCalledOnce();
  });

  it("rejects an invalid record before inserting", async () => {
    const { repository, query } = createRepository();

    const invalidRecord = createRecord({
      id: "",
    });

    await expect(repository.appendIdempotent(invalidRecord)).rejects.toThrow(
      SupabaseLearningRecordRepositoryError,
    );

    expect(query.insert).not.toHaveBeenCalled();
  });
});
