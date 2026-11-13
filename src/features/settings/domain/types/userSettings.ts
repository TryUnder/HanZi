export type UserSettingsValue =
  | string
  | number
  | boolean
  | null
  | UserSettingsObject
  | readonly UserSettingsValue[];

export interface UserSettingsObject {
  readonly [key: string]: UserSettingsValue;
}

export interface UserSettings {
  readonly userId: string;
  readonly settings: UserSettingsObject;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export const DEFAULT_USER_SETTINGS: UserSettingsObject = {};
