
import type {
  VocabularyEntry,
  VocabularyLearningData,
  VocabularyLearningStatus,
} from "../types/vocabulary";

const VALID_STATUSES: readonly VocabularyLearningStatus[] = ["draft", "verified"];

const LEARNING_DATA_KEYS = ["status", "meanings", "examples", "notes"] as const;
const EXAMPLE_KEYS = ["simplified", "pinyin", "meaning"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonEmptyStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isVocabularyLearningStatus(value: unknown): value is VocabularyLearningStatus {
  return (
    typeof value === "string" &&
    VALID_STATUSES.includes(value as VocabularyLearningStatus)
  );
}

function validateExample(value: unknown, path: string, errors: string[]): void {
  if (!isRecord(value)) {
    errors.push(`${path}: expected an object.`);
    return;
  }

  if (!hasOnlyKeys(value, EXAMPLE_KEYS)) {
    errors.push(`${path}: contains unexpected properties.`);
  }

  for (const key of EXAMPLE_KEYS) {
    if (!isNonEmptyString(value[key])) {
      errors.push(`${path}.${key}: expected a non-empty string.`);
    }
  }
}

/**
 * Validates the sparse learning dataset against the generated vocabulary.
 * Returns an empty array when all records are valid.
 */
export function validateVocabularyLearningDataset(
  dataset: unknown,
  vocabulary: readonly Pick<VocabularyEntry, "id">[],
): string[] {
  const errors: string[] = [];

  if (!isRecord(dataset)) {
    return ["Learning dataset: expected an object keyed by vocabulary ID."];
  }

  const vocabularyIds = new Set(vocabulary.map((entry) => entry.id));

  for (const [id, rawEntry] of Object.entries(dataset)) {
    const path = `Learning dataset["${id}"]`;

    if (!vocabularyIds.has(id)) {
      errors.push(`${path}: unknown vocabulary ID.`);
    }

    if (!isRecord(rawEntry)) {
      errors.push(`${path}: expected an object.`);
      continue;
    }

    if (!hasOnlyKeys(rawEntry, LEARNING_DATA_KEYS)) {
      errors.push(`${path}: contains unexpected properties.`);
    }

    if (!isVocabularyLearningStatus(rawEntry.status)) {
      errors.push(`${path}.status: expected "draft" or "verified".`);
    }

    if (!isNonEmptyStringArray(rawEntry.meanings)) {
      errors.push(`${path}.meanings: expected an array of non-empty strings.`);
    }

    if (!Array.isArray(rawEntry.examples)) {
      errors.push(`${path}.examples: expected an array.`);
    } else {
      rawEntry.examples.forEach((example, index) => {
        validateExample(example, `${path}.examples[${index}]`, errors);
      });
    }

    if (!isStringArray(rawEntry.notes) || !rawEntry.notes.every(isNonEmptyString)) {
      errors.push(`${path}.notes: expected an array of non-empty strings.`);
    }

    if (
      rawEntry.status === "verified" &&
      (!Array.isArray(rawEntry.meanings) || rawEntry.meanings.length === 0)
    ) {
      errors.push(`${path}: verified entries must contain at least one meaning.`);
    }
  }

  return errors;
}

/**
 * Type guard for an individual learning record.
 */
export function isVocabularyLearningData(value: unknown): value is VocabularyLearningData {
  if (!isRecord(value) || !hasOnlyKeys(value, LEARNING_DATA_KEYS)) {
    return false;
  }

  if (!isVocabularyLearningStatus(value.status)) {
    return false;
  }

  if (!isNonEmptyStringArray(value.meanings) || !Array.isArray(value.examples)) {
    return false;
  }

  if (!isStringArray(value.notes) || !value.notes.every(isNonEmptyString)) {
    return false;
  }

  if (value.status === "verified" && value.meanings.length === 0) {
    return false;
  }

  return value.examples.every((example) => {
    if (!isRecord(example) || !hasOnlyKeys(example, EXAMPLE_KEYS)) {
      return false;
    }

    return EXAMPLE_KEYS.every((key) => isNonEmptyString(example[key]));
  });
}
