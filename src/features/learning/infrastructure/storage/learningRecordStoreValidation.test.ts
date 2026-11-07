import { describe, expect, it } from "vitest";
import { isLearningRecordStore } from "./learningRecordStoreValidation";

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

const validStore = {
  schemaVersion: 1,
  revision: 0,
  records: [validRecord],
};

describe("isLearningRecordStore", () => {
  it("accepts a valid version 1 store", () => {
    expect(isLearningRecordStore(validStore)).toBe(true);
  });

  it("accepts an empty store", () => {
    expect(
      isLearningRecordStore({
        schemaVersion: 1,
        revision: 0,
        records: [],
      }),
    ).toBe(true);
  });

  it("accepts a store with a positive revision", () => {
    expect(
      isLearningRecordStore({
        ...validStore,
        revision: 12,
      }),
    ).toBe(true);
  });

  it("rejects an unsupported schema version", () => {
    expect(
      isLearningRecordStore({
        ...validStore,
        schemaVersion: 2,
      }),
    ).toBe(false);
  });

  it("rejects a negative revision", () => {
    expect(
      isLearningRecordStore({
        ...validStore,
        revision: -1,
      }),
    ).toBe(false);
  });

  it("rejects a non-integer revision", () => {
    expect(
      isLearningRecordStore({
        ...validStore,
        revision: 1.5,
      }),
    ).toBe(false);
  });

  it("rejects an unsafe integer revision", () => {
    expect(
      isLearningRecordStore({
        ...validStore,
        revision: Number.MAX_SAFE_INTEGER + 1,
      }),
    ).toBe(false);
  });

  it("rejects missing records", () => {
    expect(
      isLearningRecordStore({
        schemaVersion: 1,
        revision: 0,
      }),
    ).toBe(false);
  });

  it("rejects invalid learning records", () => {
    expect(
      isLearningRecordStore({
        ...validStore,
        records: [{ id: "invalid" }],
      }),
    ).toBe(false);
  });

  it("rejects duplicate record IDs", () => {
    expect(
      isLearningRecordStore({
        ...validStore,
        records: [
          validRecord,
          {
            ...validRecord,
            item: {
              kind: "character",
              id: "hao",
            },
          },
        ],
      }),
    ).toBe(false);
  });

  it("rejects null and primitive values", () => {
    expect(isLearningRecordStore(null)).toBe(false);
    expect(isLearningRecordStore(undefined)).toBe(false);
    expect(isLearningRecordStore("store")).toBe(false);
    expect(isLearningRecordStore(123)).toBe(false);
  });
});
