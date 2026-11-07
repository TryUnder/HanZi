import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseCedictFile } from "./cedictParser.mjs";
import { parseHskCollection } from "./hskParser.mjs";
import { matchHskWithCedict } from "./hskCedictMatcher.mjs";
import { buildHskDiagnostics } from "./hskDiagnostics.mjs";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_DIRECTORY = resolve(PROJECT_ROOT, "data/sources");

const CEDICT_PATH = resolve(SOURCE_DIRECTORY, "cedict_1_0_ts_utf-8_mdbg.txt");

const HSK_DIRECTORY = resolve(SOURCE_DIRECTORY, "hsk2012");

const REPORT_PATH = resolve(
  PROJECT_ROOT,
  "reports/hsk-cedict-coverage-report.json",
);

async function main() {
  console.log("Starting HSK and CC-CEDICT analysis...\n");

  const cedictContent = await readFile(CEDICT_PATH, "utf8");
  const cedictEntries = parseCedictFile(cedictContent);

  const hskSources = new Map();

  for (let level = 1; level <= 6; level += 1) {
    const fileName = `HSK2012_${level}.txt`;
    const filePath = resolve(HSK_DIRECTORY, fileName);

    console.log(`Reading ${fileName}...`);

    hskSources.set(level, await readFile(filePath, "utf8"));
  }

  const hskWords = parseHskCollection(hskSources);

  const result = matchHskWithCedict(hskWords, cedictEntries);
  const diagnostics = buildHskDiagnostics(result.words);

  const unmatchedWords = result.words.filter(
    (entry) => entry.entries.length === 0,
  );

  const matchedExamples = result.words
    .filter((entry) => entry.entries.length > 0)
    .slice(0, 20);

  const report = {
    generatedAt: new Date().toISOString(),

    sources: {
      hsk: "HSK 2012",
      cedict: "CC-CEDICT",
      cedictLicense: "CC BY-SA 4.0",
    },

    statistics: result.statistics,
    diagnostics,

    levels: Object.fromEntries(
      Array.from({ length: 6 }, (_, index) => {
        const level = index + 1;
        const levelWords = result.words.filter((entry) =>
          entry.levels.includes(level),
        );

        const matched = levelWords.filter(
          (entry) => entry.entries.length > 0,
        ).length;

        return [
          `HSK${level}`,
          {
            totalWords: levelWords.length,
            matchedWords: matched,
            unmatchedWords: levelWords.length - matched,
            coveragePercentage:
              levelWords.length === 0
                ? 0
                : Number(((matched / levelWords.length) * 100).toFixed(2)),
          },
        ];
      }),
    ),

    unmatchedWords,

    examples: {
      matchedWords: matchedExamples,
    },
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });

  await writeFile(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log("\nHSK and CC-CEDICT analysis completed.\n");

  console.log(`Total HSK entries: ${result.statistics.totalHskEntries}`);
  console.log(`Unique HSK words: ${result.statistics.uniqueHskWords}`);
  console.log(
    `Words in multiple HSK levels: ${result.statistics.duplicateWordsAcrossLevels}`,
  );
  console.log(`Matched words: ${result.statistics.matchedWords}`);
  console.log(`Unmatched words: ${result.statistics.unmatchedWords}`);
  console.log(`Coverage: ${result.statistics.coveragePercentage}%`);

  console.log("\nCoverage by level:");

  for (const [level, statistics] of Object.entries(report.levels)) {
    console.log(
      `${level}: ${statistics.matchedWords}/${statistics.totalWords} (${statistics.coveragePercentage}%)`,
    );
  }

  console.log(`\nReport: ${REPORT_PATH}`);

  console.log("\nDictionary diagnostics:");

  console.log(
    `Words in multiple HSK levels: ${diagnostics.statistics.wordsInMultipleLevels}`,
  );

  console.log(
    `Words with multiple pronunciations: ${diagnostics.statistics.wordsWithMultiplePronunciations}`,
  );

  console.log(
    `Words with multiple entries for the same pronunciation: ${diagnostics.statistics.wordsWithMultipleEntriesSamePronunciation}`,
  );
}

await main();
