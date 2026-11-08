import { describe, expect, it } from "vitest";
import type { LearningRecord, LearningStatusChanged } from "../types";
import { getLatestLearningStatuses } from "./getLatestLearningStatuses";

function createStatusRecord(
  id: string,
  itemId: string,
  occurredAt: string,
  status: LearningStatusChanged["status"],
  kind: "character" | "vocabulary" = "character",
): LearningStatusChanged {
  return {
    id,
    item: { kind, id: itemId },
    occurredAt,
    recordType: "status-changed",
    status,
  };
}

describe("getLatestLearningStatuses", () => {
  it("returns the latest status for each item", () => {
    const records: LearningRecord[] = [
      createStatusRecord("1", "ni", "2026-11-01T10:00:00.000Z", "learning"),
      createStatusRecord("2", "ni", "2026-11-02T10:00:00.000Z", "known"),
      createStatusRecord(
        "3",
        "hao",
        "2026-11-01T12:00:00.000Z",
        "needs-practice",
      ),
    ];

    const result = getLatestLearningStatuses(records);

    expect(result.size).toBe(2);
    expect(result.get("character:ni")?.status).toBe("known");
    expect(result.get("character:hao")?.status).toBe("needs-practice");
  });

  it("keeps the later record when timestamps are identical", () => {
    const records: LearningRecord[] = [
      createStatusRecord("1", "ni", "2026-11-01T10:00:00.000Z", "learning"),
      createStatusRecord("2", "ni", "2026-11-01T10:00:00.000Z", "known"),
    ];

    const result = getLatestLearningStatuses(records);

    expect(result.get("character:ni")?.id).toBe("2");
    expect(result.get("character:ni")?.status).toBe("known");
  });

  it("distinguishes characters from vocabulary with the same ID", () => {
    const records: LearningRecord[] = [
      createStatusRecord("1", "hao", "2026-11-01T10:00:00.000Z", "learning"),
      createStatusRecord(
        "2",
        "hao",
        "2026-11-01T11:00:00.000Z",
        "known",
        "vocabulary",
      ),
    ];

    const result = getLatestLearningStatuses(records);

    expect(result.size).toBe(2);
    expect(result.get("character:hao")?.status).toBe("learning");
    expect(result.get("vocabulary:hao")?.status).toBe("known");
  });

  it("ignores learning attempts", () => {
    const records: LearningRecord[] = [
      createStatusRecord("1", "ni", "2026-11-01T10:00:00.000Z", "learning"),
      {
        id: "2",
        item: { kind: "character", id: "ni" },
        occurredAt: "2026-11-02T10:00:00.000Z",
        recordType: "attempt",
        activity: "recognition",
        details: { isCorrect: true },
      },
    ];

    const result = getLatestLearningStatuses(records);

    expect(result.size).toBe(1);
    expect(result.get("character:ni")?.status).toBe("learning");
  });

  it("returns an empty map when there are no status records", () => {
    expect(getLatestLearningStatuses([])).toEqual(new Map());
  });

  it.each(["learning", "known", "needs-practice", "not-learning"] as const)(
    "supports the %s status",
    (status) => {
      const records = [
        createStatusRecord("1", "ni", "2026-11-01T10:00:00.000Z", status),
      ];

      expect(
        getLatestLearningStatuses(records).get("character:ni")?.status,
      ).toBe(status);
    },
  );
});
