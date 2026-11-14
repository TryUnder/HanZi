import { LearningSessionService } from "../../features/learning/application/services/LearningSessionService";
import type { LearningSessionRepository } from "../../features/learning/application/ports/learningSessionRepository";
import { SupabaseLearningSessionRepository } from "../../features/learning/infrastructure/supabase/supabaseLearningSessionRepository";
import { supabase } from "../../services/supabase/supabaseClient";

export function createLearningSessionService(
  repository: LearningSessionRepository,
): LearningSessionService {
  return new LearningSessionService(repository);
}

const learningSessionRepository = new SupabaseLearningSessionRepository(
  supabase,
);

export const learningSessionService = createLearningSessionService(
  learningSessionRepository,
);
