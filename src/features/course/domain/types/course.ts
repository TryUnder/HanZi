import type { HskLevel } from "../../../../shared/domain/types/hsk";

export interface Course {
  readonly id: string;
  readonly level: HskLevel;
  readonly title: string;
  readonly description: string;
  readonly lessonIds: readonly string[];
}
