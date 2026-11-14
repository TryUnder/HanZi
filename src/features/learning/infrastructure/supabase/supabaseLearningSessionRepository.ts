import type { SupabaseClient } from "@supabase/supabase-js";

import type { LearningSession } from "../../domain/types/learningSession";
import { isLearningSession } from "../../domain/rules/learningSessionValidation";
import type { LearningSessionRepository } from "../../application/ports/learningSessionRepository";

interface LearningSessionRow {
  readonly id: string;
  readonly user_id: string;
  readonly exercise_type: string;
  readonly status: string;
  readonly started_at: string;
  readonly completed_at: string | null;
  readonly total_items: number;
  readonly completed_items: number;
  readonly context: unknown;
}

interface LearningSessionInsert {
  readonly id: string;
  readonly exercise_type: LearningSession["exerciseType"];
  readonly status: LearningSession["status"];
  readonly started_at: string;
  readonly completed_at: string | null;
  readonly total_items: number;
  readonly completed_items: number;
  readonly context: LearningSession["context"] | null;
}

const LEARNING_SESSION_COLUMNS = [
  "id",
  "user_id",
  "exercise_type",
  "status",
  "started_at",
  "completed_at",
  "total_items",
  "completed_items",
  "context",
].join(", ");

export class SupabaseLearningSessionRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SupabaseLearningSessionRepositoryError";
  }
}

export class SupabaseLearningSessionRepository implements LearningSessionRepository {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  private toInsertRow(session: LearningSession): LearningSessionInsert {
    return {
      id: session.id,
      exercise_type: session.exerciseType,
      status: session.status,
      started_at: session.startedAt,
      completed_at: session.completedAt,
      total_items: session.totalItems,
      completed_items: session.completedItems,
      context: session.context ?? null,
    };
  }

  private mapRows(rows: readonly LearningSessionRow[]): LearningSession[] {
    return rows.map((row) => {
      const session: LearningSession = {
        id: row.id,
        exerciseType: row.exercise_type as LearningSession["exerciseType"],
        status: row.status as LearningSession["status"],
        startedAt: row.started_at,
        completedAt: row.completed_at,
        totalItems: row.total_items,
        completedItems: row.completed_items,
        ...(row.context !== null
          ? {
              context: row.context as NonNullable<LearningSession["context"]>,
            }
          : {}),
      };

      if (!isLearningSession(session)) {
        throw new SupabaseLearningSessionRepositoryError(
          `Invalid learning session data received from Supabase: ${row.id}.`,
        );
      }

      const timestampsMatch =
        Date.parse(row.started_at) === Date.parse(session.startedAt) &&
        (row.completed_at === null
          ? session.completedAt === null
          : session.completedAt !== null &&
            Date.parse(row.completed_at) === Date.parse(session.completedAt));

      const metadataMatches =
        row.id === session.id &&
        row.exercise_type === session.exerciseType &&
        row.status === session.status &&
        row.total_items === session.totalItems &&
        row.completed_items === session.completedItems &&
        timestampsMatch;

      if (!metadataMatches) {
        throw new SupabaseLearningSessionRepositoryError(
          `Learning session metadata does not match its payload: ${row.id}.`,
        );
      }

      return session;
    });
  }

  private hasSameCreationData(
    existing: LearningSession,
    candidate: LearningSession,
  ): boolean {
    const timestampsMatch =
      Date.parse(existing.startedAt) === Date.parse(candidate.startedAt);

    const contextsMatch =
      (existing.context?.courseId ?? null) ===
        (candidate.context?.courseId ?? null) &&
      (existing.context?.lessonId ?? null) ===
        (candidate.context?.lessonId ?? null) &&
      (existing.context?.activityId ?? null) ===
        (candidate.context?.activityId ?? null);

    return (
      existing.id === candidate.id &&
      existing.exerciseType === candidate.exerciseType &&
      timestampsMatch &&
      existing.totalItems === candidate.totalItems &&
      contextsMatch
    );
  }

  async getAll(): Promise<readonly LearningSession[]> {
    const { data, error } = await this.client
      .from("learning_sessions")
      .select(LEARNING_SESSION_COLUMNS)
      .order("started_at", { ascending: false });

    if (error) {
      throw new SupabaseLearningSessionRepositoryError(
        "Unable to load learning sessions from Supabase.",
        { cause: error },
      );
    }

    return this.mapRows((data ?? []) as unknown as LearningSessionRow[]);
  }

  async getById(id: string): Promise<LearningSession | null> {
    const { data, error } = await this.client
      .from("learning_sessions")
      .select(LEARNING_SESSION_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new SupabaseLearningSessionRepositoryError(
        "Unable to load the learning session from Supabase.",
        { cause: error },
      );
    }

    if (!data) {
      return null;
    }

    return this.mapRows([data as unknown as LearningSessionRow])[0] ?? null;
  }

  async create(session: LearningSession): Promise<void> {
    if (!isLearningSession(session)) {
      throw new SupabaseLearningSessionRepositoryError(
        "Cannot save an invalid learning session.",
      );
    }

    const { error } = await this.client
      .from("learning_sessions")
      .insert(this.toInsertRow(session));

    if (error) {
      throw new SupabaseLearningSessionRepositoryError(
        "Unable to create a learning session in Supabase.",
        { cause: error },
      );
    }
  }

  async createIdempotent(session: LearningSession): Promise<void> {
    if (!isLearningSession(session)) {
      throw new SupabaseLearningSessionRepositoryError(
        "Cannot save an invalid learning session.",
      );
    }

    const { error } = await this.client
      .from("learning_sessions")
      .insert(this.toInsertRow(session));

    if (!error) {
      return;
    }

    if (error.code !== "23505") {
      throw new SupabaseLearningSessionRepositoryError(
        "Unable to create a learning session in Supabase.",
        { cause: error },
      );
    }

    const existingSession = await this.getById(session.id);

    if (!existingSession) {
      throw new SupabaseLearningSessionRepositoryError(
        `A learning session with the same ID could not be verified: ${session.id}.`,
        { cause: error },
      );
    }

    if (!this.hasSameCreationData(existingSession, session)) {
      throw new SupabaseLearningSessionRepositoryError(
        "A learning session with the same ID already exists with different data.",
        { cause: error },
      );
    }
  }

  async update(session: LearningSession): Promise<void> {
    if (!isLearningSession(session)) {
      throw new SupabaseLearningSessionRepositoryError(
        "Cannot update an invalid learning session.",
      );
    }

    const { data, error } = await this.client
      .from("learning_sessions")
      .update({
        status: session.status,
        completed_at: session.completedAt,
        completed_items: session.completedItems,
      })
      .eq("id", session.id)
      .select("id")
      .maybeSingle();

    if (error) {
      throw new SupabaseLearningSessionRepositoryError(
        "Unable to update a learning session in Supabase.",
        { cause: error },
      );
    }

    if (!data) {
      throw new SupabaseLearningSessionRepositoryError(
        `Learning session not found or inaccessible: ${session.id}.`,
      );
    }
  }
}
