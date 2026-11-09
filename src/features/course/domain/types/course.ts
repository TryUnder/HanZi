import type { HskLevel } from "../../../library/types/character";

export interface Course {
  readonly id: string;
  readonly level: HskLevel;
  readonly title: string;
  readonly description: string;
  readonly lessonIds: readonly string[];
}
