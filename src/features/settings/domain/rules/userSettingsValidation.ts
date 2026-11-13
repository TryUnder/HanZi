import type {
  UserSettingsObject,
  UserSettingsValue,
} from "../types/userSettings";
import { isHskLevelFilter } from "../../../../shared/domain/rules/hskValidation";
import type { HskLevelFilter } from "../../../../shared/domain/types/hsk";

const MAX_DEPTH = 10;

function isSettingsValue(
  value: unknown,
  depth = 0,
): value is UserSettingsValue {
  if (depth > MAX_DEPTH) {
    return false;
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (Array.isArray(value)) {
    return value.every((item) => isSettingsValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);

    if (prototype !== Object.prototype && prototype !== null) {
      return false;
    }

    return Object.values(value).every((item) =>
      isSettingsValue(item, depth + 1),
    );
  }

  return false;
}

export function isUserSettingsObject(
  value: unknown,
): value is UserSettingsObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return isSettingsValue(value);
}

export function getDefaultHskLevel(
  settings: UserSettingsObject | null,
): HskLevelFilter {
  const value = settings?.defaultHskLevel;

  return isHskLevelFilter(value) ? value : "all";
}
