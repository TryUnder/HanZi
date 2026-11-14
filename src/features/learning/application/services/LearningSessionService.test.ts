import { describe, expect, it } from "vitest";

import type { LearningSession } from "../../domain/types/learningSession";
import type { LearningSessionRepository } from "../ports/learningSessionRepository";
import {
  LearningSessionService,
  LearningSessionServiceError,
} from "./LearningSessionService";

class InMemoryLearningSessionRepository implements LearningSessionRepository {
  private sessions: LearningSession[] = [];

  async getAll(): Promise<readonly LearningSession[]> {
    return [...this.sessions];
  }

  async getById(id: string): Promise<LearningSession | null> {
    return this.sessions.find((session) => session.id === id) ?? null;
  }

  async create(session: LearningSession): Promise<void> {
    if (this.sessions.some((existing) => existing.id === session.id)) {
      throw new Error("Duplicate session ID.");
    }

    this.sessions.push(session);
  }

  async createIdempotent(session: LearningSession): Promise<void> {
    const existing = await this.getById(session.id);

    if (!existing) {
      this.sessions.push(session);
      return;
    }

    const timestampsMatch =
      Date.parse(existing.startedAt) === Date.parse(session.startedAt);

    const contextsMatch =
      (existing.context?.courseId ?? null) ===
        (session.context?.courseId ?? null) &&
      (existing.context?.lessonId ?? null) ===
        (session.context?.lessonId ?? null) &&
      (existing.context?.activityId ?? null) ===
        (session.context?.activityId ?? null);

    const sameCreationData =
      existing.id === session.id &&
      existing.exerciseType === session.exerciseType &&
      timestampsMatch &&
      existing.totalItems === session.totalItems &&
      contextsMatch;

    if (!sameCreationData) {
      throw new Error(
        "A learning session with the same ID already exists with different data.",
      );
    }
  }

  async update(session: LearningSession): Promise<void> {
    const index = this.sessions.findIndex(
      (existing) => existing.id === session.id,
    );

    if (index === -1) {
      throw new Error("Session not found.");
    }

    this.sessions[index] = session;
  }
}

describe("LearningSessionService", () => {
  function createService() {
    const repository = new InMemoryLearningSessionRepository();
    let idCounter = 0;

    const service = new LearningSessionService(repository, {
      generateId: () => `session-${++idCounter}`,
      getCurrentTimestamp: () => "2026-11-13T19:00:00.000Z",
    });

    return { service, repository };
  }

  const input = {
    exerciseType: "writing-practice" as const,
    totalItems: 3,
    context: {
      courseId: "hsk-1",
      lessonId: "lesson-1",
      activityId: "writing",
    },
  };

  it("starts a session with zero completed items", async () => {
    const { service, repository } = createService();

    const session = await service.startSession(input);

    expect(session).toEqual({
      id: "session-1",
      exerciseType: "writing-practice",
      status: "in-progress",
      startedAt: "2026-11-13T19:00:00.000Z",
      completedAt: null,
      totalItems: 3,
      completedItems: 0,
      context: input.context,
    });

    await expect(repository.getById(session.id)).resolves.toEqual(session);
  });

  it("preserves a supplied session ID and start timestamp", async () => {
    const { service, repository } = createService();

    const session = await service.startSession({
      ...input,
      id: "stable-session-id",
      startedAt: "2026-11-12T10:30:00.000Z",
    });

    expect(session.id).toBe("stable-session-id");
    expect(session.startedAt).toBe("2026-11-12T10:30:00.000Z");

    await expect(repository.getById(session.id)).resolves.toEqual(session);
  });

  it("accepts a retry with the same ID and creation data", async () => {
    const { service, repository } = createService();

    const stableInput = {
      ...input,
      id: "stable-session-id",
      startedAt: "2026-11-13T19:00:00.000Z",
    };

    const firstSession = await service.startSession(stableInput);
    const retriedSession = await service.startSession(stableInput);

    expect(retriedSession).toEqual(firstSession);
    await expect(repository.getAll()).resolves.toHaveLength(1);
  });

  it("rejects reusing a session ID with different creation data", async () => {
    const { service, repository } = createService();

    const stableInput = {
      ...input,
      id: "stable-session-id",
      startedAt: "2026-11-13T19:00:00.000Z",
    };

    await service.startSession(stableInput);

    await expect(
      service.startSession({
        ...stableInput,
        totalItems: 5,
      }),
    ).rejects.toThrow(
      "A learning session with the same ID already exists with different data.",
    );

    await expect(repository.getAll()).resolves.toHaveLength(1);
  });

  it("rejects reusing a session ID with a different start timestamp", async () => {
    const { service } = createService();

    const stableInput = {
      ...input,
      id: "stable-session-id",
      startedAt: "2026-11-13T19:00:00.000Z",
    };

    await service.startSession(stableInput);

    await expect(
      service.startSession({
        ...stableInput,
        startedAt: "2026-11-13T20:00:00.000Z",
      }),
    ).rejects.toThrow(
      "A learning session with the same ID already exists with different data.",
    );
  });

  it("creates separate sessions when no ID is supplied", async () => {
    const { service, repository } = createService();

    const firstSession = await service.startSession(input);
    const secondSession = await service.startSession(input);

    expect(firstSession.id).toBe("session-1");
    expect(secondSession.id).toBe("session-2");
    await expect(repository.getAll()).resolves.toHaveLength(2);
  });

  it("rejects sessions without items", async () => {
    const { service } = createService();

    await expect(
      service.startSession({ ...input, totalItems: 0 }),
    ).rejects.toThrow(LearningSessionServiceError);
  });

  it("updates progress without completing the session", async () => {
    const { service } = createService();

    const session = await service.startSession(input);
    const updated = await service.updateProgress(session.id, 2);

    expect(updated.completedItems).toBe(2);
    expect(updated.status).toBe("in-progress");
    expect(updated.completedAt).toBeNull();
  });

  it("does not complete a session before all items are processed", async () => {
    const { service } = createService();

    const session = await service.startSession(input);
    await service.updateProgress(session.id, 2);

    await expect(service.completeSession(session.id)).rejects.toThrow(
      "before all items are processed.",
    );
  });

  it("completes a session only after all items are processed", async () => {
    const { service, repository } = createService();

    const session = await service.startSession(input);
    await service.updateProgress(session.id, 3);

    const completed = await service.completeSession(session.id);

    expect(completed.status).toBe("completed");
    expect(completed.completedItems).toBe(3);
    expect(completed.completedAt).toBe("2026-11-13T19:00:00.000Z");

    await expect(repository.getById(session.id)).resolves.toEqual(completed);
  });

  it("returns an already completed session when the same progress is submitted again", async () => {
    const { service, repository } = createService();

    const session = await service.startSession(input);
    await service.updateProgress(session.id, 3);

    const completed = await service.completeSession(session.id);
    const retried = await service.updateProgress(session.id, 3);

    expect(retried).toEqual(completed);
    await expect(repository.getById(session.id)).resolves.toEqual(completed);
  });

  it("does not allow changing progress after a session is completed", async () => {
    const { service } = createService();

    const session = await service.startSession(input);
    await service.updateProgress(session.id, 3);
    await service.completeSession(session.id);

    await expect(service.updateProgress(session.id, 2)).rejects.toThrow(
      "Only an in-progress session can be modified.",
    );
  });

  it("returns an already completed session without updating it again", async () => {
    const { service, repository } = createService();

    const session = await service.startSession(input);
    await service.updateProgress(session.id, 3);

    const firstCompletion = await service.completeSession(session.id);
    const secondCompletion = await service.completeSession(session.id);

    expect(secondCompletion).toEqual(firstCompletion);
    await expect(repository.getById(session.id)).resolves.toEqual(
      firstCompletion,
    );
  });

  it("abandons a session without losing its progress", async () => {
    const { service } = createService();

    const session = await service.startSession(input);
    await service.updateProgress(session.id, 2);

    const abandoned = await service.abandonSession(session.id);

    expect(abandoned.status).toBe("abandoned");
    expect(abandoned.completedItems).toBe(2);
    expect(abandoned.completedAt).toBeNull();
  });

  it("does not allow progress to decrease", async () => {
    const { service } = createService();

    const session = await service.startSession(input);
    await service.updateProgress(session.id, 2);

    await expect(service.updateProgress(session.id, 1)).rejects.toThrow(
      "progress value is invalid.",
    );
  });

  it("does not allow progress beyond the total item count", async () => {
    const { service } = createService();

    const session = await service.startSession(input);

    await expect(service.updateProgress(session.id, 4)).rejects.toThrow(
      "progress value is invalid.",
    );
  });

  it("does not allow modifying an abandoned session", async () => {
    const { service } = createService();

    const session = await service.startSession(input);
    await service.abandonSession(session.id);

    await expect(service.updateProgress(session.id, 1)).rejects.toThrow(
      "Only an in-progress session can be modified.",
    );
  });

  it("returns all sessions", async () => {
    const { service } = createService();

    await service.startSession(input);
    await service.startSession({
      ...input,
      exerciseType: "memory-writing",
    });

    await expect(service.getAllSessions()).resolves.toHaveLength(2);
  });
});
