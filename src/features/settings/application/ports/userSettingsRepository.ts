import type {
  UserSettings,
  UserSettingsObject,
} from "../../domain/types/userSettings";

/**
 * Persistence contract for user settings.
 *
 * The repository resolves the currently authenticated user.
 */
export interface UserSettingsRepository {
  get(): Promise<UserSettings>;

  save(settings: UserSettingsObject): Promise<UserSettings>;
}
