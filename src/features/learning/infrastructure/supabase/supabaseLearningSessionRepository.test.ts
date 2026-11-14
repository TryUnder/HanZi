import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { LearningSession } from "../../domain/types/learningSession";
import {
  SupabaseLearningSessionRepository,
  SupabaseLearningSessionRepositoryError,
} from "./supabaseLearningSessionRepository";

interface QueryResult {
  readonly data: unknown;
  readonly error: {
    readonly message: string;
    readonly code?: string;
  } | null;
}

function createQueryBuilder(
  insertResult: QueryResult,
  singleResult: QueryResult = insertResult,
) {
  const builder = {
    select: vi.fn(() => builder),
    order: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    insert: vi.fn((values: unknown) => {
      void values;
      return builder;
    }),
    update: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => singleResult),
    then: (
      onFulfilled: (value: QueryResult) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(insertResult).then(onFulfilled, onRejected),
  };

  return builder;
}

function createRepository(
  result: QueryResult,
  singleResult: QueryResult = result,
) {
  const query = createQueryBuilder(result, singleResult);

  const client = {
    from: vi.fn(() => query),
  } as unknown as SupabaseClient;

  return {
    repository: new SupabaseLearningSessionRepository(client),
    client,
    query,
  };
}

function createSession(
  overrides: Partial<LearningSession> = {},
): LearningSession {
  return {
    id: "session-1",
    exerciseType: "writing-practice",
    status: "in-progress",
    startedAt: "2026-11-13T19:00:00.000Z",
    completedAt: null,
    totalItems: 3,
    completedItems: 0,
    context: {
      courseId: "hsk-1",
      lessonId: "lesson-1",
      activityId: "writing",
    },
    ...overrides,
  };
}

function createRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "session-1",
    user_id: "user-1",
    exercise_type: "writing-practice",
    status: "in-progress",
    started_at: "2026-11-13T19:00:00.000Z",
    completed_at: null,
    total_items: 3,
    completed_items: 0,
    context: {
      courseId: "hsk-1",
      lessonId: "lesson-1",
      activityId: "writing",
    },
    ...overrides,
  };
}

describe("SupabaseLearningSessionRepository", () => {
  it("loads all sessions ordered by start date", async () => {
    const row = createRow();
    const { repository, client, query } = createRepository({
      data: [row],
      error: null,
    });

    const sessions = await repository.getAll();

    expect(sessions).toEqual([createSession()]);
    expect(client.from).toHaveBeenCalledWith("learning_sessions");
    expect(query.select).toHaveBeenCalledOnce();
    expect(query.order).toHaveBeenCalledWith("started_at", {
      ascending: false,
    });
  });

  it("returns an empty array when no sessions exist", async () => {
    const { repository } = createRepository({
      data: null,
      error: null,
    });

    await expect(repository.getAll()).resolves.toEqual([]);
  });

  it("loads a session by ID", async () => {
    const { repository, query } = createRepository({
      data: createRow(),
      error: null,
    });

    const session = await repository.getById("session-1");

    expect(session).toEqual(createSession());
    expect(query.eq).toHaveBeenCalledWith("id", "session-1");
    expect(query.maybeSingle).toHaveBeenCalledOnce();
  });

  it("returns null when a session does not exist", async () => {
    const { repository } = createRepository({
      data: null,
      error: null,
    });

    await expect(repository.getById("missing")).resolves.toBeNull();
  });

  it("creates a session without sending user_id", async () => {
    const { repository, query } = createRepository({
      data: null,
      error: null,
    });

    await expect(repository.create(createSession())).resolves.toBeUndefined();

    expect(query.insert).toHaveBeenCalledWith({
      id: "session-1",
      exercise_type: "writing-practice",
      status: "in-progress",
      started_at: "2026-11-13T19:00:00.000Z",
      completed_at: null,
      total_items: 3,
      completed_items: 0,
      context: {
        courseId: "hsk-1",
        lessonId: "lesson-1",
        activityId: "writing",
      },
    });

    const insertedRow = query.insert.mock.calls[0]?.[0];

    expect(insertedRow).not.toHaveProperty("user_id");
  });

  it("keeps strict duplicate behavior in create", async () => {
    const { repository } = createRepository({
      data: null,
      error: {
        message: "Duplicate session",
        code: "23505",
      },
    });

    await expect(repository.create(createSession())).rejects.toThrow(
      SupabaseLearningSessionRepositoryError,
    );
  });

  it("creates a session idempotently when the insert succeeds", async () => {
    const { repository, query } = createRepository({
      data: null,
      error: null,
    });

    await expect(
      repository.createIdempotent(createSession()),
    ).resolves.toBeUndefined();

    expect(query.insert).toHaveBeenCalledOnce();
    expect(query.maybeSingle).not.toHaveBeenCalled();
  });

  it("accepts an existing session with matching creation data", async () => {
    const { repository, query } = createRepository(
      {
        data: null,
        error: {
          message: "Duplicate session",
          code: "23505",
        },
      },
      {
        data: createRow(),
        error: null,
      },
    );

    await expect(
      repository.createIdempotent(createSession()),
    ).resolves.toBeUndefined();

    expect(query.insert).toHaveBeenCalledOnce();
    expect(query.eq).toHaveBeenCalledWith("id", "session-1");
    expect(query.maybeSingle).toHaveBeenCalledOnce();
  });

  it("accepts an existing session even when it has already been completed", async () => {
    const completedRow = createRow({
      status: "completed",
      completed_at: "2026-11-13T19:10:00.000Z",
      completed_items: 3,
    });

    const { repository } = createRepository(
      {
        data: null,
        error: {
          message: "Duplicate session",
          code: "23505",
        },
      },
      {
        data: completedRow,
        error: null,
      },
    );

    await expect(
      repository.createIdempotent(createSession()),
    ).resolves.toBeUndefined();
  });

  it("rejects an existing session with different creation data", async () => {
    const { repository } = createRepository(
      {
        data: null,
        error: {
          message: "Duplicate session",
          code: "23505",
        },
      },
      {
        data: createRow({
          total_items: 5,
        }),
        error: null,
      },
    );

    await expect(repository.createIdempotent(createSession())).rejects.toThrow(
      "A learning session with the same ID already exists with different data.",
    );
  });

  it("rejects a duplicate when the existing session cannot be found", async () => {
    const { repository } = createRepository(
      {
        data: null,
        error: {
          message: "Duplicate session",
          code: "23505",
        },
      },
      {
        data: null,
        error: null,
      },
    );

    await expect(repository.createIdempotent(createSession())).rejects.toThrow(
      "A learning session with the same ID could not be verified: session-1.",
    );
  });

  it("wraps non-duplicate insert errors", async () => {
    const { repository } = createRepository({
      data: null,
      error: {
        message: "Database unavailable",
        code: "08006",
      },
    });

    await expect(repository.createIdempotent(createSession())).rejects.toThrow(
      SupabaseLearningSessionRepositoryError,
    );
  });

  it("updates only mutable session fields", async () => {
    const { repository, query } = createRepository({
      data: { id: "session-1" },
      error: null,
    });

    const session = createSession({ completedItems: 2 });

    await repository.update(session);

    expect(query.update).toHaveBeenCalledWith({
      status: "in-progress",
      completed_at: null,
      completed_items: 2,
    });
    expect(query.eq).toHaveBeenCalledWith("id", "session-1");
    expect(query.select).toHaveBeenCalledWith("id");
    expect(query.maybeSingle).toHaveBeenCalledOnce();
  });

  it("rejects an update when the session is not found or accessible", async () => {
    const { repository } = createRepository({
      data: null,
      error: null,
    });

    await expect(repository.update(createSession())).rejects.toThrow(
      SupabaseLearningSessionRepositoryError,
    );
  });

  it("wraps Supabase read errors", async () => {
    const { repository } = createRepository({
      data: null,
      error: { message: "Database unavailable" },
    });

    await expect(repository.getAll()).rejects.toThrow(
      SupabaseLearningSessionRepositoryError,
    );
  });

  it("rejects invalid session data returned by Supabase", async () => {
    const { repository } = createRepository({
      data: [
        createRow({
          completed_items: 4,
        }),
      ],
      error: null,
    });

    await expect(repository.getAll()).rejects.toThrow(
      SupabaseLearningSessionRepositoryError,
    );
  });

  it("rejects a session with an invalid context returned by Supabase", async () => {
    const { repository } = createRepository({
      data: [
        createRow({
          context: {
            courseId: "hsk-1",
          },
        }),
      ],
      error: null,
    });

    await expect(repository.getAll()).rejects.toThrow(
      SupabaseLearningSessionRepositoryError,
    );
  });
});
