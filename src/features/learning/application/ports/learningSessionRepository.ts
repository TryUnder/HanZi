import type { LearningSession } from "../../domain/types/learningSession";

export interface LearningSessionRepository {
  getAll(): Promise<readonly LearningSession[]>;

  getById(id: string): Promise<LearningSession | null>;

  create(session: LearningSession): Promise<void>;

  createIdempotent(session: LearningSession): Promise<void>;

  update(session: LearningSession): Promise<void>;
}
