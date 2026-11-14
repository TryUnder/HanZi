import type { SupabaseClient } from "@supabase/supabase-js";

import type { LearningItemReference, LearningRecord } from "../../domain/types";

import { isLearningRecord } from "../../domain/rules/learningRecordValidation";
import type { LearningRecordRepository } from "../../application/ports/learningRecordRepository";

interface LearningRecordRow {
  readonly id: string;
  readonly user_id: string;
  readonly record_type: string;
  readonly activity: string | null;
  readonly item_kind: string;
  readonly item_id: string;
  readonly occurred_at: string;
  readonly record_data: unknown;
}

interface LearningRecordInsert {
  readonly id: string;
  readonly record_type: string;
  readonly activity: string | null;
  readonly item_kind: string;
  readonly item_id: string;
  readonly occurred_at: string;
  readonly record_data: LearningRecord;
}

const LEARNING_RECORD_COLUMNS = [
  "id",
  "user_id",
  "record_type",
  "activity",
  "item_kind",
  "item_id",
  "occurred_at",
  "record_data",
].join(", ");

export class SupabaseLearningRecordRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SupabaseLearningRecordRepositoryError";
  }
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

export class SupabaseLearningRecordRepository implements LearningRecordRepository {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  private toInsertRow(record: LearningRecord): LearningRecordInsert {
    return {
      id: record.id,
      record_type: record.recordType,
      activity: record.recordType === "attempt" ? record.activity : null,
      item_kind: record.item.kind,
      item_id: record.item.id,
      occurred_at: record.occurredAt,
      record_data: record,
    };
  }

  private mapRows(rows: readonly LearningRecordRow[]): LearningRecord[] {
    return rows.map((row) => {
      const record = row.record_data;

      if (!isLearningRecord(record)) {
        throw new SupabaseLearningRecordRepositoryError(
          `Invalid learning record data received from Supabase: ${row.id}.`,
        );
      }

      const expectedActivity =
        record.recordType === "attempt" ? record.activity : null;

      const timestampsMatch =
        Date.parse(row.occurred_at) === Date.parse(record.occurredAt);

      const metadataMatches =
        row.id === record.id &&
        row.record_type === record.recordType &&
        row.activity === expectedActivity &&
        row.item_kind === record.item.kind &&
        row.item_id === record.item.id &&
        timestampsMatch;

      if (!metadataMatches) {
        throw new SupabaseLearningRecordRepositoryError(
          `Learning record metadata does not match its payload: ${row.id}.`,
        );
      }

      return record;
    });
  }

  async getAll(): Promise<readonly LearningRecord[]> {
    const { data, error } = await this.client
      .from("learning_records")
      .select(LEARNING_RECORD_COLUMNS)
      .order("occurred_at", { ascending: false });

    if (error) {
      throw new SupabaseLearningRecordRepositoryError(
        "Unable to load learning records from Supabase.",
        { cause: error },
      );
    }

    return this.mapRows((data ?? []) as unknown as LearningRecordRow[]);
  }

  async getByItem(
    item: LearningItemReference,
  ): Promise<readonly LearningRecord[]> {
    const { data, error } = await this.client
      .from("learning_records")
      .select(LEARNING_RECORD_COLUMNS)
      .eq("item_kind", item.kind)
      .eq("item_id", item.id)
      .order("occurred_at", { ascending: false });

    if (error) {
      throw new SupabaseLearningRecordRepositoryError(
        "Unable to load learning item history from Supabase.",
        { cause: error },
      );
    }

    return this.mapRows((data ?? []) as unknown as LearningRecordRow[]);
  }

  async append(record: LearningRecord): Promise<void> {
    await this.appendMany([record]);
  }

  async appendMany(records: readonly LearningRecord[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    if (!records.every(isLearningRecord)) {
      throw new SupabaseLearningRecordRepositoryError(
        "The batch contains an invalid learning record.",
      );
    }

    const incomingIds = records.map((record) => record.id);

    if (new Set(incomingIds).size !== incomingIds.length) {
      throw new SupabaseLearningRecordRepositoryError(
        "The batch contains duplicate learning record IDs.",
      );
    }

    const rows = records.map((record) => this.toInsertRow(record));

    // user_id is deliberately omitted.
    // PostgreSQL assigns auth.uid() through the column default.
    // RLS independently verifies that the current user owns the inserted row.
    const { error } = await this.client.from("learning_records").insert(rows);

    if (error) {
      throw new SupabaseLearningRecordRepositoryError(
        "Unable to save learning records to Supabase.",
        { cause: error },
      );
    }
  }

  async appendIdempotent(record: LearningRecord): Promise<void> {
    if (!isLearningRecord(record)) {
      throw new SupabaseLearningRecordRepositoryError(
        "The learning record is invalid.",
      );
    }

    const { error: insertError } = await this.client
      .from("learning_records")
      .insert(this.toInsertRow(record));

    if (!insertError) {
      return;
    }

    // PostgreSQL unique_violation. The original request may have committed
    // successfully even though its response was lost.
    if (insertError.code !== "23505") {
      throw new SupabaseLearningRecordRepositoryError(
        "Unable to save learning record to Supabase.",
        { cause: insertError },
      );
    }

    const { data, error: readError } = await this.client
      .from("learning_records")
      .select(LEARNING_RECORD_COLUMNS)
      .eq("id", record.id)
      .maybeSingle();

    if (readError) {
      throw new SupabaseLearningRecordRepositoryError(
        "Unable to verify an existing learning record in Supabase.",
        { cause: readError },
      );
    }

    if (!data) {
      throw new SupabaseLearningRecordRepositoryError(
        "The learning record ID already exists but the existing record is not accessible.",
        { cause: insertError },
      );
    }

    const existingRecord = this.mapRows([
      data as unknown as LearningRecordRow,
    ])[0];

    if (!existingRecord || !haveSameContent(existingRecord, record)) {
      throw new SupabaseLearningRecordRepositoryError(
        "A learning record with the same ID but different content already exists.",
        { cause: insertError },
      );
    }
  }
}
