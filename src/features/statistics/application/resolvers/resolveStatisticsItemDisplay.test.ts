
import { describe, expect, it } from "vitest";

import { resolveStatisticsItemDisplay } from "./resolveStatisticsItemDisplay";

describe("resolveStatisticsItemDisplay", () => {
  it("resolves a character ID into Chinese character data", () => {
    const result = resolveStatisticsItemDisplay({
      kind: "character",
      id: "ni",
    });

    expect(result).toEqual({
      kind: "character",
      simplified: "你",
      traditional: null,
      pinyin: "nǐ",
      meaning: "ty",
      hskLevels: [1],
      isResolved: true,
    });
  });

  it("resolves vocabulary using its display data", () => {
    const result = resolveStatisticsItemDisplay({
      kind: "vocabulary",
      id: "vocab-4e00",
    });

    expect(result.kind).toBe("vocabulary");
    expect(result.simplified).toBe("一");
    expect(result.pinyin).toContain("yī");
    expect(result.isResolved).toBe(true);
    expect(result.meaning).not.toBe("");
  });

  it("does not expose an unknown character ID", () => {
    const result = resolveStatisticsItemDisplay({
      kind: "character",
      id: "unknown-character-id",
    });

    expect(result.simplified).toBe("Unknown character");
    expect(result.isResolved).toBe(false);
    expect(result.simplified).not.toContain("unknown-character-id");
  });

  it("does not expose an unknown vocabulary ID", () => {
    const result = resolveStatisticsItemDisplay({
      kind: "vocabulary",
      id: "unknown-vocabulary-id",
    });

    expect(result.simplified).toBe("Unknown vocabulary");
    expect(result.isResolved).toBe(false);
    expect(result.simplified).not.toContain("unknown-vocabulary-id");
  });
});
