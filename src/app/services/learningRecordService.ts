import { LearningRecordService } from "../../features/learning/application/services/LearningRecordService";
import { LocalStorageLearningRecordRepository } from "../../features/learning/infrastructure/storage/localStorageLearningRecordRepository";

export interface AppStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Creates the application-level learning service.
 * Storage is injected so the implementation can be replaced or tested.
 */
export function createLearningRecordService(
  storage: AppStorageAdapter,
): LearningRecordService {
  const repository = new LocalStorageLearningRecordRepository(storage);

  return new LearningRecordService(repository);
}

/**
 * Default application instance.
 * Access to localStorage is deferred until a repository operation is called.
 */
export const learningRecordService = createLearningRecordService({
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
});
