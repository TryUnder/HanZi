import { describe, expect, it } from "vitest";
import type { LearningItemReference, LearningRecord } from "../../domain/types";
import type { LearningRecordRepository } from "../ports/learningRecordRepository";
import { LearningRecordService } from "./LearningRecordService";

class InMemoryLearningRecordRepository implements LearningRecordRepository {
  private records: LearningRecord[] = [];

  async getAll(): Promise<readonly LearningRecord[]> {
    return [...this.records];
  }

  async getByItem(
    item: LearningItemReference,
  ): Promise<readonly LearningRecord[]> {
    return this.records.filter(
      (record) => record.item.kind === item.kind && record.item.id === item.id,
    );
  }

  async append(record: LearningRecord): Promise<void> {
    if (this.records.some((existing) => existing.id === record.id)) {
      throw new Error("Duplicate record ID.");
    }

    this.records.push(record);
  }

  async appendMany(records: readonly LearningRecord[]): Promise<void> {
    const ids = new Set(this.records.map((record) => record.id));

    if (records.some((record) => ids.has(record.id))) {
      throw new Error("Duplicate record ID.");
    }

    this.records.push(...records);
  }
}

describe("LearningRecordService", () => {
  const item: LearningItemReference = {
    kind: "character",
    id: "ni",
  };

  function createService() {
    const repository = new InMemoryLearningRecordRepository();
    let idCounter = 0;

    const service = new LearningRecordService(repository, {
      generateId: () => `record-${++idCounter}`,
      getCurrentTimestamp: () => "2026-11-07T20:00:00.000Z",
    });

    return { service, repository };
  }

  it("records a writing attempt with generated metadata", async () => {
    const { service, repository } = createService();

    const result = await service.recordAttempt({
      item,
      recordType: "attempt",
      activity: "writing",
      details: {
        correctStrokes: 7,
        totalStrokes: 7,
        mistakes: 2,
        strokeMistakes: [{ strokeIndex: 1, mistakes: 2 }],
      },
    });

    expect(result).toEqual({
      id: "record-1",
      item,
      occurredAt: "2026-11-07T20:00:00.000Z",
      recordType: "attempt",
      activity: "writing",
      details: {
        correctStrokes: 7,
        totalStrokes: 7,
        mistakes: 2,
        strokeMistakes: [{ strokeIndex: 1, mistakes: 2 }],
      },
    });

    await expect(repository.getAll()).resolves.toEqual([result]);
  });

  it("records a speaking attempt", async () => {
    const { service } = createService();

    const result = await service.recordAttempt({
      item,
      recordType: "attempt",
      activity: "speaking",
      details: {
        expectedTone: 3,
        detectedTone: 3,
        assessmentStatus: "matched",
        confidence: 85,
        candidates: [{ tone: 3, score: 85 }],
      },
    });

    expect(result.activity).toBe("speaking");
    expect(result.id).toBe("record-1");
  });

  it("records a self-assessed status change", async () => {
    const { service } = createService();

    const result = await service.changeStatus(item, "learning");

    expect(result).toEqual({
      id: "record-1",
      item,
      occurredAt: "2026-11-07T20:00:00.000Z",
      recordType: "status-changed",
      status: "learning",
    });
  });

  it("generates unique IDs for consecutive records", async () => {
    const { service } = createService();

    const first = await service.changeStatus(item, "learning");
    const second = await service.changeStatus(item, "known");

    expect(first.id).not.toBe(second.id);
  });

  it("returns all records", async () => {
    const { service } = createService();

    await service.changeStatus(item, "learning");
    await service.changeStatus(item, "known");

    const records = await service.getAllRecords();

    expect(records).toHaveLength(2);
  });

  it("returns history for a specific item", async () => {
    const { service } = createService();

    await service.changeStatus(item, "learning");

    await service.changeStatus(
      { kind: "vocabulary", id: "ni-hao" },
      "learning",
    );

    const records = await service.getItemHistory(item);

    expect(records).toHaveLength(1);
    expect(records[0]?.item).toEqual(item);
  });
});
