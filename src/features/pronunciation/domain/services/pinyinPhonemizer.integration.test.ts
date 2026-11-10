import { describe, expect, it } from "vitest";

import vocabularyData from "../../../library/data/vocabulary.json";
import phoneVocabularyData from "../../../../../node_modules/charsiu-js/assets/vocab_zh.json";

import type { VocabularyEntry } from "../../../library/types/vocabulary";

import {
  phonemizePronunciation,
  type PhonemizationErrorCode,
} from "./pinyinPhonemizer";
import { realizeWordPronunciation } from "./toneRealizationService";

const vocabulary = vocabularyData as VocabularyEntry[];

const phoneVocabulary = phoneVocabularyData as Readonly<Record<string, number>>;

type AuditErrorCode =
  PhonemizationErrorCode | "TONE_REALIZATION" | "AUDIT_FAILURE";

interface AuditResult {
  readonly word: string;
  readonly entryId: string;
  readonly pinyin: string;
  readonly error: string | null;
  readonly errorCode: AuditErrorCode | null;
}

interface ExpectedUnsupportedReading {
  readonly word: string;
  readonly entryId: string;
  readonly pinyin: string;
  readonly errorCode: "UNSUPPORTED_SYLLABLE";
}

/**
 * Known limitation of the current Charsiu Mandarin phone inventory.
 *
 * The reading remains valid vocabulary data, but the model does not
 * contain a phone representation for the syllabic nasal in hng5.
 */
const EXPECTED_UNSUPPORTED_READINGS: readonly ExpectedUnsupportedReading[] = [
  {
    word: "哼",
    entryId: "vocab-54fc",
    pinyin: "hng5",
    errorCode: "UNSUPPORTED_SYLLABLE",
  },
];

function auditReading(entry: VocabularyEntry, pinyin: string): AuditResult {
  const realization = realizeWordPronunciation(entry.simplified, pinyin);

  if (!realization.success) {
    return {
      word: entry.simplified,
      entryId: entry.id,
      pinyin,
      error: `Tone realization: ${realization.error.message}`,
      errorCode: "TONE_REALIZATION",
    };
  }

  const phonemization = phonemizePronunciation(
    realization.syllables,
    phoneVocabulary,
  );

  if (!phonemization.success) {
    return {
      word: entry.simplified,
      entryId: entry.id,
      pinyin,
      error: `Phonemization: ${phonemization.error.message}`,
      errorCode: phonemization.error.code,
    };
  }

  const { phonemes, phoneIds } = phonemization.pronunciation;

  for (let index = 0; index < phonemes.length; index += 1) {
    const phoneme = phonemes[index];

    if (!phoneme) {
      return {
        word: entry.simplified,
        entryId: entry.id,
        pinyin,
        error: `Missing phoneme at position ${index}.`,
        errorCode: "AUDIT_FAILURE",
      };
    }

    if (phoneme.symbol === "[UNK]") {
      return {
        word: entry.simplified,
        entryId: entry.id,
        pinyin,
        error: `Unknown phoneme at position ${index}.`,
        errorCode: "AUDIT_FAILURE",
      };
    }

    if (phoneVocabulary[phoneme.symbol] !== phoneme.vocabularyId) {
      return {
        word: entry.simplified,
        entryId: entry.id,
        pinyin,
        error: `Incorrect vocabulary ID for "${phoneme.symbol}".`,
        errorCode: "AUDIT_FAILURE",
      };
    }

    if (phoneIds[index] !== phoneme.vocabularyId) {
      return {
        word: entry.simplified,
        entryId: entry.id,
        pinyin,
        error: `Phone ID sequence mismatch at position ${index}.`,
        errorCode: "AUDIT_FAILURE",
      };
    }

    if (
      !Number.isInteger(phoneme.syllableIndex) ||
      phoneme.syllableIndex < 0 ||
      phoneme.syllableIndex >= realization.syllables.length
    ) {
      return {
        word: entry.simplified,
        entryId: entry.id,
        pinyin,
        error: `Invalid syllable index at position ${index}.`,
        errorCode: "AUDIT_FAILURE",
      };
    }
  }

  return {
    word: entry.simplified,
    entryId: entry.id,
    pinyin,
    error: null,
    errorCode: null,
  };
}

function formatFailures(failures: readonly AuditResult[]): string {
  return failures
    .map(
      (failure) =>
        `${failure.word} (${failure.entryId}) — ${failure.pinyin}: ${failure.error}`,
    )
    .join("\n");
}

function formatUnsupportedReadings(readings: readonly AuditResult[]): string {
  return readings
    .map(
      (reading) =>
        `${reading.word} (${reading.entryId}) — ${reading.pinyin}: ${reading.errorCode}`,
    )
    .join("\n");
}

function isExpectedUnsupportedReading(result: AuditResult): boolean {
  return EXPECTED_UNSUPPORTED_READINGS.some(
    (expected) =>
      expected.word === result.word &&
      expected.entryId === result.entryId &&
      expected.pinyin === result.pinyin &&
      expected.errorCode === result.errorCode,
  );
}

function expectAuditResultsToBeValid(
  results: readonly AuditResult[],
  description: string,
): void {
  const unsupportedReadings = results.filter(
    (result) => result.errorCode === "UNSUPPORTED_SYLLABLE",
  );

  const unexpectedFailures = results.filter(
    (result) => result.error !== null && !isExpectedUnsupportedReading(result),
  );

  expect(
    unsupportedReadings.map((result) => ({
      word: result.word,
      entryId: result.entryId,
      pinyin: result.pinyin,
      errorCode: result.errorCode,
    })),
    `${description} — unsupported readings:\n${formatUnsupportedReadings(unsupportedReadings)}`,
  ).toEqual(EXPECTED_UNSUPPORTED_READINGS);

  expect(
    unexpectedFailures,
    `${description} — unexpected failures:\n${formatFailures(unexpectedFailures)}`,
  ).toEqual([]);
}

describe("Pinyin phonemizer integration with Charsiu vocabulary", () => {
  it("uses a valid and consistent model phone vocabulary", () => {
    const entries = Object.entries(phoneVocabulary);
    const ids = entries.map(([, id]) => id);

    expect(entries.length).toBe(212);
    expect(new Set(ids).size).toBe(ids.length);

    expect(phoneVocabulary["[PAD]"]).toBe(0);
    expect(phoneVocabulary["[SIL]"]).toBe(1);
    expect(phoneVocabulary["[UNK]"]).toBe(2);

    expect(ids.every((id) => Number.isInteger(id) && id >= 0 && id < 212)).toBe(
      true,
    );

    expect([...ids].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 212 }, (_, index) => index),
    );
  });

  it("phonemizes every supported canonical vocabulary reading", () => {
    const results: AuditResult[] = [];

    let readingCount = 0;

    for (const entry of vocabulary) {
      for (const reading of entry.readings) {
        readingCount += 1;

        results.push(auditReading(entry, reading.pinyin));
      }
    }

    expect(readingCount).toBeGreaterThan(0);

    expectAuditResultsToBeValid(results, "Canonical vocabulary readings");
  });

  it("phonemizes every supported source Pinyin variant", () => {
    const results: AuditResult[] = [];

    let variantCount = 0;

    for (const entry of vocabulary) {
      for (const reading of entry.readings) {
        for (const variant of reading.sourcePinyinVariants) {
          variantCount += 1;

          results.push(auditReading(entry, variant));
        }
      }
    }

    expect(variantCount).toBeGreaterThan(0);

    expectAuditResultsToBeValid(results, "Source Pinyin variants");
  });
});
