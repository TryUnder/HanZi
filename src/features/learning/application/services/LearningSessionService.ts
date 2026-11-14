import type {
  LearningExerciseType,
  LearningSession,
  LearningSessionContext,
} from "../../domain/types/learningSession";
import { isLearningSession } from "../../domain/rules/learningSessionValidation";
import type { LearningSessionRepository } from "../ports/learningSessionRepository";

export interface StartLearningSessionInput {
  readonly id?: string;
  readonly startedAt?: string;
  readonly exerciseType: LearningExerciseType;
  readonly totalItems: number;
  readonly context?: LearningSessionContext;
}

interface LearningSessionServiceDependencies {
  readonly generateId?: () => string;
  readonly getCurrentTimestamp?: () => string;
}

export class LearningSessionServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LearningSessionServiceError";
  }
}

export class LearningSessionService {
  private readonly repository: LearningSessionRepository;
  private readonly generateId: () => string;
  private readonly getCurrentTimestamp: () => string;

  constructor(
    repository: LearningSessionRepository,
    dependencies: LearningSessionServiceDependencies = {},
  ) {
    this.repository = repository;
    this.generateId = dependencies.generateId ?? (() => crypto.randomUUID());
    this.getCurrentTimestamp =
      dependencies.getCurrentTimestamp ?? (() => new Date().toISOString());
  }

  async startSession(
    input: StartLearningSessionInput,
  ): Promise<LearningSession> {
    if (!Number.isInteger(input.totalItems) || input.totalItems <= 0) {
      throw new LearningSessionServiceError(
        "A learning session must contain at least one item.",
      );
    }

    const session: LearningSession = {
      id: input.id ?? this.generateId(),
      exerciseType: input.exerciseType,
      status: "in-progress",
      startedAt: input.startedAt ?? this.getCurrentTimestamp(),
      completedAt: null,
      totalItems: input.totalItems,
      completedItems: 0,
      ...(input.context ? { context: input.context } : {}),
    };

    if (!isLearningSession(session)) {
      throw new LearningSessionServiceError(
        "The learning session data is invalid.",
      );
    }

    await this.repository.createIdempotent(session);

    return session;
  }

  async updateProgress(
    sessionId: string,
    completedItems: number,
  ): Promise<LearningSession> {
    const session = await this.repository.getById(sessionId);

    if (!session) {
      throw new LearningSessionServiceError(
        `Learning session not found: ${sessionId}.`,
      );
    }

    if (session.status === "completed") {
      if (completedItems === session.completedItems) {
        return session;
      }

      throw new LearningSessionServiceError(
        "Only an in-progress session can be modified.",
      );
    }

    if (session.status !== "in-progress") {
      throw new LearningSessionServiceError(
        "Only an in-progress session can be modified.",
      );
    }

    if (
      !Number.isInteger(completedItems) ||
      completedItems < session.completedItems ||
      completedItems > session.totalItems
    ) {
      throw new LearningSessionServiceError(
        "The session progress value is invalid.",
      );
    }

    const updatedSession: LearningSession = {
      ...session,
      completedItems,
    };

    await this.repository.update(updatedSession);

    return updatedSession;
  }

  async completeSession(sessionId: string): Promise<LearningSession> {
    const session = await this.repository.getById(sessionId);

    if (!session) {
      throw new LearningSessionServiceError(
        `Learning session not found: ${sessionId}.`,
      );
    }

    if (session.status === "completed") {
      if (session.completedItems !== session.totalItems) {
        throw new LearningSessionServiceError(
          "A completed session must contain all processed items.",
        );
      }

      return session;
    }

    if (session.status !== "in-progress") {
      throw new LearningSessionServiceError(
        "Only an in-progress session can be modified.",
      );
    }

    if (session.completedItems !== session.totalItems) {
      throw new LearningSessionServiceError(
        "A session cannot be completed before all items are processed.",
      );
    }

    const completedSession: LearningSession = {
      ...session,
      status: "completed",
      completedAt: this.getCurrentTimestamp(),
    };

    await this.repository.update(completedSession);

    return completedSession;
  }

  async abandonSession(sessionId: string): Promise<LearningSession> {
    const session = await this.getInProgressSession(sessionId);

    const abandonedSession: LearningSession = {
      ...session,
      status: "abandoned",
    };

    await this.repository.update(abandonedSession);

    return abandonedSession;
  }

  getAllSessions(): Promise<readonly LearningSession[]> {
    return this.repository.getAll();
  }

  private async getInProgressSession(
    sessionId: string,
  ): Promise<LearningSession> {
    const session = await this.repository.getById(sessionId);

    if (!session) {
      throw new LearningSessionServiceError(
        `Learning session not found: ${sessionId}.`,
      );
    }

    if (session.status !== "in-progress") {
      throw new LearningSessionServiceError(
        "Only an in-progress session can be modified.",
      );
    }

    return session;
  }
}
