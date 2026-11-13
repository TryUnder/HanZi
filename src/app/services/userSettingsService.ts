import { UserSettingsService } from "../../features/settings/application/services/UserSettingsService";
import type { UserSettingsRepository } from "../../features/settings/application/ports/userSettingsRepository";

import { SupabaseUserSettingsRepository } from "../../features/settings/infrastructure/supabase/supabaseUserSettingsRepository";

import { supabase } from "../../services/supabase/supabaseClient";

/**
 * Creates the application-level user settings service.
 */
export function createUserSettingsService(
  repository: UserSettingsRepository,
): UserSettingsService {
  return new UserSettingsService(repository);
}

/**
 * Default application instance using Supabase.
 */
const userSettingsRepository = new SupabaseUserSettingsRepository(supabase);

export const userSettingsService = createUserSettingsService(
  userSettingsRepository,
);
