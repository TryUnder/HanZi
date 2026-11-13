import type { SupabaseClient } from "@supabase/supabase-js";

import { isUserSettingsObject } from "../../domain/rules/userSettingsValidation";
import {
  DEFAULT_USER_SETTINGS,
  type UserSettings,
  type UserSettingsObject,
} from "../../domain/types/userSettings";
import type { UserSettingsRepository } from "../../application/ports/userSettingsRepository";

interface UserSettingsRow {
  readonly user_id: string;
  readonly settings: unknown;
  readonly created_at: string;
  readonly updated_at: string;
}

const USER_SETTINGS_COLUMNS = [
  "user_id",
  "settings",
  "created_at",
  "updated_at",
].join(", ");

export class SupabaseUserSettingsRepositoryError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SupabaseUserSettingsRepositoryError";
  }
}

export class SupabaseUserSettingsRepository implements UserSettingsRepository {
  private readonly client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  private async getCurrentUserId(): Promise<string> {
    const { data, error } = await this.client.auth.getUser();

    if (error || !data.user) {
      throw new SupabaseUserSettingsRepositoryError(
        "Unable to resolve the currently authenticated user.",
        { cause: error },
      );
    }

    return data.user.id;
  }

  private mapRow(row: UserSettingsRow): UserSettings {
    if (!isUserSettingsObject(row.settings)) {
      throw new SupabaseUserSettingsRepositoryError(
        "Invalid settings data received from Supabase.",
      );
    }

    if (
      !row.user_id ||
      !Number.isFinite(Date.parse(row.created_at)) ||
      !Number.isFinite(Date.parse(row.updated_at))
    ) {
      throw new SupabaseUserSettingsRepositoryError(
        "Invalid user settings metadata received from Supabase.",
      );
    }

    return {
      userId: row.user_id,
      settings: row.settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async get(): Promise<UserSettings> {
    const userId = await this.getCurrentUserId();

    const { data, error } = await this.client
      .from("user_settings")
      .select(USER_SETTINGS_COLUMNS)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new SupabaseUserSettingsRepositoryError(
        "Unable to load user settings from Supabase.",
        { cause: error },
      );
    }

    if (data) {
      return this.mapRow(data as unknown as UserSettingsRow);
    }

    // A settings row is normally created by the auth signup trigger.
    // This fallback also supports accounts created before that trigger existed.
    return this.save(DEFAULT_USER_SETTINGS);
  }

  async save(settings: UserSettingsObject): Promise<UserSettings> {
    if (!isUserSettingsObject(settings)) {
      throw new SupabaseUserSettingsRepositoryError(
        "Cannot persist invalid user settings.",
      );
    }

    const userId = await this.getCurrentUserId();

    const { data, error } = await this.client
      .from("user_settings")
      .upsert(
        {
          user_id: userId,
          settings,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        },
      )
      .select(USER_SETTINGS_COLUMNS)
      .single();

    if (error || !data) {
      throw new SupabaseUserSettingsRepositoryError(
        "Unable to save user settings to Supabase.",
        { cause: error },
      );
    }

    return this.mapRow(data as unknown as UserSettingsRow);
  }
}
