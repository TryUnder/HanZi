import { describe, expect, it } from "vitest";
import { hsk1Lessons } from "../../../course/data/hsk/hsk1";
import { resolveLessonItems } from "./lessonContentService";

describe("resolveLessonItems", () => {
  it("resolves all vocabulary references from the first HSK 1 lesson", () => {
    const lesson = hsk1Lessons[0];

    if (!lesson) {
      throw new Error("HSK 1 lesson not found");
    }

    const result = resolveLessonItems(lesson.items);

    expect(result.missingItems).toEqual([]);
    expect(result.items).toHaveLength(lesson.items.length);
    expect(result.items.every((item) => item.kind === "vocabulary")).toBe(true);
  });

  it("returns complete vocabulary data from Library", () => {
    const result = resolveLessonItems([
      { kind: "vocabulary", id: "vocab-6211" },
    ]);

    expect(result.missingItems).toEqual([]);
    expect(result.items).toHaveLength(1);

    const item = result.items[0];

    expect(item?.kind).toBe("vocabulary");

    if (item?.kind === "vocabulary") {
      expect(item.data.simplified).toBe("我");
      expect(item.data.readings.length).toBeGreaterThan(0);
      expect(item.data.meanings.length).toBeGreaterThan(0);
    }
  });

  it("reports references that do not exist in Library", () => {
    const result = resolveLessonItems([
      { kind: "vocabulary", id: "missing-vocabulary" },
    ]);

    expect(result.items).toEqual([]);
    expect(result.missingItems).toEqual([
      { kind: "vocabulary", id: "missing-vocabulary" },
    ]);
  });
});
