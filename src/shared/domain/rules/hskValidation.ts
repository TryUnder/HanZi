import type { HskLevel, HskLevelFilter } from "../types/hsk";

const HSK_LEVELS: readonly HskLevel[] = [1, 2, 3, 4, 5, 6];

export function isHskLevel(value: unknown): value is HskLevel {
  return typeof value === "number" && HSK_LEVELS.includes(value as HskLevel);
}

export function isHskLevelFilter(value: unknown): value is HskLevelFilter {
  return value === "all" || isHskLevel(value);
}
