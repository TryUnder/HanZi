import { describe, expect, it } from "vitest";
import {
  isLearningRecordStorageData,
  LEARNING_RECORDS_STORAGE_VERSION,
} from "./learningRecordStorageSchema";

const validRecord = {
  id: "record-001",
  item: {
    kind: "character",
    id: "ni",
  },
  occurredAt: "2026-11-07T18:00:00.000Z",
  recordType: "status-changed",
  status: "learning",
};

describe("isLearningRecordStorageData", () => {
  it("accepts a valid storage envelope", () => {
    expect(
      isLearningRecordStorageData({
        version: LEARNING_RECORDS_STORAGE_VERSION,
        records: [validRecord],
      }),
    ).toBe(true);
  });

  it("accepts an empty record collection", () => {
    expect(
      isLearningRecordStorageData({
        version: LEARNING_RECORDS_STORAGE_VERSION,
        records: [],
      }),
    ).toBe(true);
  });

  it("accepts multiple different records", () => {
    const secondRecord = {
      ...validRecord,
      id: "record-002",
      status: "known",
    };

    expect(
      isLearningRecordStorageData({
        version: LEARNING_RECORDS_STORAGE_VERSION,
        records: [validRecord, secondRecord],
      }),
    ).toBe(true);
  });

  it("rejects duplicate record IDs", () => {
    expect(
      isLearningRecordStorageData({
        version: LEARNING_RECORDS_STORAGE_VERSION,
        records: [validRecord, validRecord],
      }),
    ).toBe(false);
  });

  it("rejects an invalid record", () => {
    expect(
      isLearningRecordStorageData({
        version: LEARNING_RECORDS_STORAGE_VERSION,
        records: [
          {
            ...validRecord,
            status: "invalid-status",
          },
        ],
      }),
    ).toBe(false);
  });

  it("rejects an unsupported schema version", () => {
    expect(
      isLearningRecordStorageData({
        version: 999,
        records: [validRecord],
      }),
    ).toBe(false);
  });

  it("rejects missing records", () => {
    expect(
      isLearningRecordStorageData({
        version: LEARNING_RECORDS_STORAGE_VERSION,
      }),
    ).toBe(false);
  });

  it("rejects null and primitive values", () => {
    expect(isLearningRecordStorageData(null)).toBe(false);
    expect(isLearningRecordStorageData(undefined)).toBe(false);
    expect(isLearningRecordStorageData("invalid")).toBe(false);
    expect(isLearningRecordStorageData(123)).toBe(false);
  });
});
