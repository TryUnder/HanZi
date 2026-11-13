import {
  DEFAULT_USER_SETTINGS,
  type UserSettings,
  type UserSettingsObject,
} from "../../domain/types/userSettings";
import { isUserSettingsObject } from "../../domain/rules/userSettingsValidation";
import type { UserSettingsRepository } from "../ports/userSettingsRepository";

export class UserSettingsServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserSettingsServiceError";
  }
}

export class UserSettingsService {
  private readonly repository: UserSettingsRepository;

  constructor(repository: UserSettingsRepository) {
    this.repository = repository;
  }

  getSettings(): Promise<UserSettings> {
    return this.repository.get();
  }

  saveSettings(settings: UserSettingsObject): Promise<UserSettings> {
    if (!isUserSettingsObject(settings)) {
      throw new UserSettingsServiceError("Cannot save invalid user settings.");
    }

    return this.repository.save(settings);
  }

  /**
   * Updates selected top-level settings without replacing the entire object.
   */
  async updateSettings(updates: UserSettingsObject): Promise<UserSettings> {
    if (!isUserSettingsObject(updates)) {
      throw new UserSettingsServiceError(
        "Cannot update settings with invalid data.",
      );
    }

    const current = await this.repository.get();

    const mergedSettings: UserSettingsObject = {
      ...DEFAULT_USER_SETTINGS,
      ...current.settings,
      ...updates,
    };

    return this.repository.save(mergedSettings);
  }
}
