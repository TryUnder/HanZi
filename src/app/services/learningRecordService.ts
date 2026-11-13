import { LearningRecordService } from "../../features/learning/application/services/LearningRecordService";
import type { LearningRecordRepository } from "../../features/learning/application/ports/learningRecordRepository";

import { SupabaseLearningRecordRepository } from "../../features/learning/infrastructure/supabase/supabaseLearningRecordRepository";

import { supabase } from "../../services/supabase/supabaseClient";

/**
 * Creates the application-level learning service.
 * Repository implementation is injected to keep the application
 * layer independent of the storage technology.
 */
export function createLearningRecordService(
  repository: LearningRecordRepository,
): LearningRecordService {
  return new LearningRecordService(repository);
}

/**
 * Default application instance.
 *
 * Supabase uses the currently authenticated session.
 * Row Level Security isolates records between users.
 */
const learningRecordRepository = new SupabaseLearningRecordRepository(supabase);

export const learningRecordService = createLearningRecordService(
  learningRecordRepository,
);
