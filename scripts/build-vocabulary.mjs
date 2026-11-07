import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseCedictFile } from "./cedictParser.mjs";
import { parseHskCollection } from "./hskParser.mjs";
import { matchHskWithCedict } from "./hskCedictMatcher.mjs";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_DIRECTORY = resolve(PROJECT_ROOT, "data/sources");
const CEDICT_PATH = resolve(
  SOURCE_DIRECTORY,
  "cedict_1_0_ts_utf-8_mdbg.txt",
);
const HSK_DIRECTORY = resolve(SOURCE_DIRECTORY, "hsk2012");

const OUTPUT_DIRECTORY = resolve(
  PROJECT_ROOT,
  "src/features/library/data",
);
const OUTPUT_PATH = resolve(OUTPUT_DIRECTORY, "vocabulary.json");

const REPORT_DIRECTORY = resolve(PROJECT_ROOT, "reports");
const REPORT_PATH = resolve(
  REPORT_DIRECTORY,
  "vocabulary-build-report.json",
);

const compareText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Creates a stable identifier from a simplified Chinese word.
 *
 * Example:
 * 爱 -> vocab-7231
 *
 * @param {string} word
 * @returns {string}
 */
export function createVocabularyId(word) {
  if (typeof word !== "string" || word.length === 0) {
    throw new TypeError("Vocabulary word must be a non-empty string.");
  }

  const codePoints = Array.from(word)
    .map((character) => character.codePointAt(0).toString(16))
    .join("-");

  return `vocab-${codePoints}`;
}

/**
 * Converts matcher output into the application's vocabulary model.
 *
 * All original CC-CEDICT entries are preserved.
 * Entries sharing the same normalized Pinyin are grouped into one reading.
 *
 * @param {Array<{
 *   word: string,
 *   levels: number[],
 *   entries: Array<{
 *     traditional: string,
 *     simplified: string,
 *     pinyin: string,
 *     normalizedPinyin: string,
 *     definitions: string[]
 *   }>
 * }>} matchedWords
 */
export function buildVocabulary(matchedWords) {
  if (!Array.isArray(matchedWords)) {
    throw new TypeError("Matched vocabulary must be an array.");
  }

  const vocabulary = matchedWords.map((matchedWord) => {
    const { word, levels, entries } = matchedWord;

    if (typeof word !== "string" || word.length === 0) {
      throw new Error("Encountered an invalid simplified vocabulary word.");
    }

    if (!Array.isArray(levels) || !Array.isArray(entries)) {
      throw new Error(`Invalid matcher result for word: ${word}`);
    }

    const readingsByPinyin = new Map();

    const traditionalVariants = new Set();

    for (const entry of entries) {
      if (
        typeof entry.traditional !== "string" ||
        typeof entry.pinyin !== "string" ||
        typeof entry.normalizedPinyin !== "string" ||
        !Array.isArray(entry.definitions)
      ) {
        throw new Error(`Invalid CC-CEDICT entry for word: ${word}`);
      }

      traditionalVariants.add(entry.traditional);

      const pinyin = entry.normalizedPinyin;

      const reading = readingsByPinyin.get(pinyin) ?? {
        pinyin,
        sourcePinyinVariants: new Set(),
        entries: [],
      };

      reading.sourcePinyinVariants.add(entry.pinyin);

      reading.entries.push({
        traditional: entry.traditional,
        definitions: [...entry.definitions],
      });

      readingsByPinyin.set(pinyin, reading);
    }

    const readings = [...readingsByPinyin.values()]
      .map((reading) => ({
        pinyin: reading.pinyin,
        sourcePinyinVariants: [...reading.sourcePinyinVariants].sort(
          compareText,
        ),
        entries: reading.entries,
      }))
      .sort((a, b) => compareText(a.pinyin, b.pinyin));

    return {
      id: createVocabularyId(word),
      simplified: word,
      traditionalVariants: [...traditionalVariants].sort(compareText),
      hskLevels: [...new Set(levels)].sort((a, b) => a - b),
      readings,
      audioUrl: null,
    };
  });

  vocabulary.sort((a, b) => compareText(a.simplified, b.simplified));

  validateVocabulary(vocabulary);

  return vocabulary;
}

/**
 * Performs basic runtime validation of generated vocabulary.
 *
 * @param {Array<{
 *   id: string,
 *   simplified: string,
 *   traditionalVariants: string[],
 *   hskLevels: number[],
 *   readings: Array<{
 *     pinyin: string,
 *     sourcePinyinVariants: string[],
 *     entries: Array<{
 *       traditional: string,
 *       definitions: string[]
 *     }>
 *   }>,
 *   audioUrl: string | null
 * }>} vocabulary
 */
export function validateVocabulary(vocabulary) {
  const ids = new Set();
  const words = new Set();

  for (const entry of vocabulary) {
    if (
      typeof entry.id !== "string" ||
      typeof entry.simplified !== "string" ||
      entry.simplified.length === 0
    ) {
      throw new Error("Vocabulary contains an invalid identifier or word.");
    }

    if (ids.has(entry.id)) {
      throw new Error(`Duplicate vocabulary ID: ${entry.id}`);
    }

    if (words.has(entry.simplified)) {
      throw new Error(`Duplicate simplified word: ${entry.simplified}`);
    }

    ids.add(entry.id);
    words.add(entry.simplified);

    if (
      !Array.isArray(entry.traditionalVariants) ||
      !Array.isArray(entry.hskLevels) ||
      !Array.isArray(entry.readings)
    ) {
      throw new Error(`Invalid data structure for word: ${entry.simplified}`);
    }

    if (
      entry.hskLevels.some(
        (level) => !Number.isInteger(level) || level < 1 || level > 6,
      )
    ) {
      throw new Error(`Invalid HSK level for word: ${entry.simplified}`);
    }

    for (const reading of entry.readings) {
      if (
        typeof reading.pinyin !== "string" ||
        !Array.isArray(reading.sourcePinyinVariants) ||
        !Array.isArray(reading.entries)
      ) {
        throw new Error(`Invalid reading for word: ${entry.simplified}`);
      }

      for (const dictionaryEntry of reading.entries) {
        if (
          typeof dictionaryEntry.traditional !== "string" ||
          !Array.isArray(dictionaryEntry.definitions) ||
          dictionaryEntry.definitions.some(
            (definition) => typeof definition !== "string",
          )
        ) {
          throw new Error(
            `Invalid dictionary entry for word: ${entry.simplified}`,
          );
        }
      }
    }

    if (entry.audioUrl !== null && typeof entry.audioUrl !== "string") {
      throw new Error(`Invalid audio URL for word: ${entry.simplified}`);
    }
  }

  return true;
}

async function writeJsonAtomically(filePath, data) {
  await mkdir(dirname(filePath), { recursive: true });

  const temporaryPath = `${filePath}.tmp`;

  await writeFile(
    temporaryPath,
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );

  await rename(temporaryPath, filePath);
}

async function loadHskWords() {
  const sources = new Map();

  for (let level = 1; level <= 6; level += 1) {
    const fileName = `HSK2012_${level}.txt`;
    const filePath = resolve(HSK_DIRECTORY, fileName);

    console.log(`Reading ${fileName}...`);

    sources.set(level, await readFile(filePath, "utf8"));
  }

  return parseHskCollection(sources);
}

async function main() {
  console.log("Building HanZi vocabulary dataset...\n");

  const cedictContent = await readFile(CEDICT_PATH, "utf8");
  const cedictEntries = parseCedictFile(cedictContent);

  console.log(`CC-CEDICT entries loaded: ${cedictEntries.length}`);

  const hskWords = await loadHskWords();

  console.log(`HSK entries loaded: ${hskWords.length}`);

  const matchResult = matchHskWithCedict(hskWords, cedictEntries);
  const vocabulary = buildVocabulary(matchResult.words);

  const totalReadings = vocabulary.reduce(
    (total, word) => total + word.readings.length,
    0,
  );

  const totalDictionaryEntries = vocabulary.reduce(
    (total, word) =>
      total +
      word.readings.reduce(
        (readingTotal, reading) => readingTotal + reading.entries.length,
        0,
      ),
    0,
  );

  const wordsWithMultipleReadings = vocabulary.filter(
    (word) => word.readings.length > 1,
  ).length;

  const wordsWithoutDictionaryEntries = vocabulary.filter(
    (word) => word.readings.length === 0,
  );

  const report = {
    generatedAt: new Date().toISOString(),

    sources: {
      hsk: "HSK 2012",
      dictionary: "CC-CEDICT",
      dictionaryLicense: "CC BY-SA 4.0",
    },

    statistics: {
      totalWords: vocabulary.length,
      matchedWords: matchResult.statistics.matchedWords,
      unmatchedWords: matchResult.statistics.unmatchedWords,
      totalReadings,
      totalDictionaryEntries,
      wordsWithMultipleReadings,
      wordsWithoutDictionaryEntries: wordsWithoutDictionaryEntries.length,
    },

    hskLevels: Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => {
        const level = index + 1;

        const count = vocabulary.filter((word) =>
          word.hskLevels.includes(level),
        ).length;

        return [`HSK${level}`, count];
      }),
    ),

    unmatchedWords: wordsWithoutDictionaryEntries.map((word) => ({
      simplified: word.simplified,
      hskLevels: word.hskLevels,
    })),
  };

  await writeJsonAtomically(OUTPUT_PATH, vocabulary);
  await writeJsonAtomically(REPORT_PATH, report);

  console.log("\nVocabulary generation completed.\n");

  console.log(`Total words: ${report.statistics.totalWords}`);
  console.log(`Matched words: ${report.statistics.matchedWords}`);
  console.log(`Unmatched words: ${report.statistics.unmatchedWords}`);
  console.log(`Total readings: ${report.statistics.totalReadings}`);
  console.log(
    `Dictionary entries: ${report.statistics.totalDictionaryEntries}`,
  );
  console.log(
    `Words with multiple readings: ${report.statistics.wordsWithMultipleReadings}`,
  );

  console.log("\nWords by HSK level:");

  for (const [level, count] of Object.entries(report.hskLevels)) {
    console.log(`${level}: ${count}`);
  }

  console.log(`\nVocabulary: ${OUTPUT_PATH}`);
  console.log(`Report: ${REPORT_PATH}`);
}

const isMainModule =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  await main();
}