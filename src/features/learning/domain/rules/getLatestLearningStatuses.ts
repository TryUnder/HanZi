import type { LearningRecord, LearningStatusChanged } from "../types";

/**
 * Returns the latest status-change record for each learning item.
 *
 * When timestamps are identical, the record appearing later in the
 * input array takes precedence.
 */
export function getLatestLearningStatuses(
  records: readonly LearningRecord[],
): ReadonlyMap<string, LearningStatusChanged> {
  const latestStatuses = new Map<string, LearningStatusChanged>();

  for (const record of records) {
    if (record.recordType !== "status-changed") {
      continue;
    }

    const key = `${record.item.kind}:${record.item.id}`;
    const current = latestStatuses.get(key);

    if (
      !current ||
      Date.parse(record.occurredAt) >= Date.parse(current.occurredAt)
    ) {
      latestStatuses.set(key, record);
    }
  }

  return latestStatuses;
}
