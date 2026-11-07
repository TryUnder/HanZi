import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { normalizePinyin } from "./pinyinNormalizer.mjs";
import { parseCedictFile } from "./cedictParser.mjs";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_PATH = resolve(
  PROJECT_ROOT,
  "data/sources/cedict_1_0_ts_utf-8_mdbg.txt",
);

const REPORT_PATH = resolve(PROJECT_ROOT, "reports/cedict-parser-report.json");

/**
 * Groups dictionary entries by simplified word and normalized pronunciation.
 *
 * Original Pinyin notation is preserved for reporting.
 *
 * @param {import("./cedictParser.mjs").CedictEntry[]} entries
 */
function analyzePronunciations(entries) {
  /** @type {Map<string, Map<string, Set<string>>>} */
  const pronunciationsByWord = new Map();

  for (const entry of entries) {
    const wordPronunciations =
      pronunciationsByWord.get(entry.simplified) ?? new Map();

    const normalizedPinyin = normalizePinyin(entry.pinyin);

    const originalVariants =
      wordPronunciations.get(normalizedPinyin) ?? new Set();

    originalVariants.add(entry.pinyin);

    wordPronunciations.set(normalizedPinyin, originalVariants);
    pronunciationsByWord.set(entry.simplified, wordPronunciations);
  }

  const multiplePronunciationWords = [];
  const equivalentNotationWords = [];

  for (const [word, pronunciations] of pronunciationsByWord) {
    const normalizedReadings = [...pronunciations.entries()];

    if (normalizedReadings.length > 1) {
      multiplePronunciationWords.push({
        word,
        pronunciations: normalizedReadings.map(([normalized]) => normalized),
        sourceVariants: normalizedReadings.map(([, variants]) => [...variants]),
      });
    }

    for (const [normalized, sourceVariants] of normalizedReadings) {
      if (sourceVariants.size > 1) {
        equivalentNotationWords.push({
          word,
          normalizedPronunciation: normalized,
          sourceVariants: [...sourceVariants],
        });
      }
    }
  }

  return {
    wordsWithMultiplePronunciations: multiplePronunciationWords,
    wordsWithEquivalentNotation: equivalentNotationWords,
  };
}

async function main() {
  console.log("Starting CC-CEDICT parsing...\n");

  const content = await readFile(SOURCE_PATH, "utf8");
  const entries = parseCedictFile(content);

  const simplifiedWords = new Set(entries.map((entry) => entry.simplified));

  const traditionalWords = new Set(entries.map((entry) => entry.traditional));

  const pronunciationAnalysis = analyzePronunciations(entries);

  const report = {
    generatedAt: new Date().toISOString(),
    source: "CC-CEDICT",
    license: "CC BY-SA 4.0",

    totalEntries: entries.length,
    uniqueSimplifiedWords: simplifiedWords.size,
    uniqueTraditionalWords: traditionalWords.size,

    wordsWithMultiplePronunciations:
      pronunciationAnalysis.wordsWithMultiplePronunciations.length,

    wordsWithEquivalentNotation:
      pronunciationAnalysis.wordsWithEquivalentNotation.length,

    examples: {
      multiplePronunciations:
        pronunciationAnalysis.wordsWithMultiplePronunciations.slice(0, 30),

      equivalentNotation:
        pronunciationAnalysis.wordsWithEquivalentNotation.slice(0, 30),

      sampleEntries: entries.slice(0, 20),
    },
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });

  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log("CC-CEDICT parsing completed.\n");
  console.log(`Total entries: ${report.totalEntries}`);
  console.log(`Unique simplified words: ${report.uniqueSimplifiedWords}`);
  console.log(`Unique traditional words: ${report.uniqueTraditionalWords}`);

  console.log(
    `Words with multiple pronunciations: ${report.wordsWithMultiplePronunciations}`,
  );

  console.log(
    `Words with equivalent notation variants: ${report.wordsWithEquivalentNotation}`,
  );

  console.log(`Report: ${REPORT_PATH}`);
}

await main();
