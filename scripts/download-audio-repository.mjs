
import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const VOCABULARY_PATH = resolve(
  PROJECT_ROOT,
  "src/features/library/data/vocabulary.json",
);

const AUDIO_DIRECTORY = resolve(PROJECT_ROOT, "public/audio");

const MANIFEST_PATH = resolve(
  PROJECT_ROOT,
  "src/features/library/data/audio-manifest.json",
);

const REPORT_PATH = resolve(
  PROJECT_ROOT,
  "reports/audio-repository-import-report.json",
);

const REPOSITORY = "hugolpz/audio-cmn";
const BRANCH = "master";
const QUALITY = "64k";

const TREE_URL =
  `https://api.github.com/repos/${REPOSITORY}/git/trees/${BRANCH}?recursive=1`;

const RAW_BASE_URL =
  `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}`;

const FORCE_DOWNLOAD = process.argv.includes("--force");

const LIMIT_ARGUMENT = process.argv.find((argument) =>
  argument.startsWith("--limit="),
);

const DOWNLOAD_LIMIT = LIMIT_ARGUMENT
  ? Number(LIMIT_ARGUMENT.split("=")[1])
  : Infinity;

const CONCURRENCY = 8;
const MAX_ATTEMPTS = 3;

function isValidMp3(buffer) {
  if (buffer.length < 4) {
    return false;
  }

  const hasId3Header =
    buffer[0] === 0x49 &&
    buffer[1] === 0x44 &&
    buffer[2] === 0x33;

  const hasMpegFrameHeader =
    buffer[0] === 0xff &&
    (buffer[1] & 0xe0) === 0xe0;

  return hasId3Header || hasMpegFrameHeader;
}

function getAudioFileFromTree(entry) {
  const match = entry.path.match(
    /^64k\/(hsk|syllabs)\/([^/]+\.mp3)$/i,
  );

  if (!match) {
    return null;
  }

  const category = match[1] === "hsk" ? "hsk" : "syllables";
  const filename = match[2];

  return {
    category,
    filename,
    key: filename.replace(/^cmn-/i, "").replace(/\.mp3$/i, ""),
    sourcePath: entry.path,
    sourceUrl: `${RAW_BASE_URL}/${entry.path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    destination: resolve(AUDIO_DIRECTORY, category, filename),
    audioUrl: `/audio/${category}/${encodeURIComponent(filename)}`,
  };
}

async function fetchSourceFiles() {
  console.log("Fetching GitHub repository file list...");

  const response = await fetch(TREE_URL, {
    headers: {
      "User-Agent": "HanZi-audio-import",
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `GitHub API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  if (!Array.isArray(data.tree)) {
    throw new Error("Invalid GitHub response: missing repository tree.");
  }

  if (data.truncated) {
    throw new Error(
      "GitHub returned a truncated file list. Refusing incomplete import.",
    );
  }

  const files = data.tree
    .filter((entry) => entry.type === "blob")
    .map(getAudioFileFromTree)
    .filter(Boolean)
    .sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));

  const hskFiles = files.filter((file) => file.category === "hsk");
  const syllableFiles = files.filter(
    (file) => file.category === "syllables",
  );

  console.log(`HSK recordings: ${hskFiles.length}`);
  console.log(`Syllable recordings: ${syllableFiles.length}`);
  console.log(`Total recordings: ${files.length}\n`);

  return files;
}

async function downloadFile(file) {
  if (!FORCE_DOWNLOAD) {
    try {
      const existingFile = await readFile(file.destination);

      if (isValidMp3(existingFile)) {
        return {
          sourcePath: file.sourcePath,
          filename: file.filename,
          category: file.category,
          status: "skipped",
          sizeBytes: existingFile.length,
        };
      }
    } catch {
      // File does not exist. Continue with download.
    }
  }

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let temporaryPath;

    try {
      const response = await fetch(file.sourceUrl, {
        headers: {
          "User-Agent": "HanZi-audio-import",
        },
      });

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} ${response.statusText}`,
        );
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      if (!isValidMp3(buffer)) {
        throw new Error("Downloaded file is not a valid MP3.");
      }

      const sha256 = createHash("sha256")
        .update(buffer)
        .digest("hex");

      await mkdir(dirname(file.destination), {
        recursive: true,
      });

      temporaryPath = `${file.destination}.${process.pid}.tmp`;

      await writeFile(temporaryPath, buffer);
      await rename(temporaryPath, file.destination);

      return {
        sourcePath: file.sourcePath,
        filename: file.filename,
        category: file.category,
        status: "downloaded",
        sizeBytes: buffer.length,
        sha256,
        attempts: attempt,
      };
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : String(error);

      if (temporaryPath) {
        await rm(temporaryPath, { force: true }).catch(() => {});
      }

      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolveDelay) =>
          setTimeout(resolveDelay, attempt * 1000),
        );
      }
    }
  }

  return {
    sourcePath: file.sourcePath,
    filename: file.filename,
    category: file.category,
    status: "failed",
    reason: lastError,
  };
}

async function downloadFiles(files) {
  const selectedFiles = files.slice(0, DOWNLOAD_LIMIT);
  const results = new Array(selectedFiles.length);

  let nextIndex = 0;
  let completed = 0;

  console.log(`Files selected for download: ${selectedFiles.length}`);
  console.log(`Concurrency: ${CONCURRENCY}\n`);

  async function worker() {
    while (true) {
      const index = nextIndex;

      if (index >= selectedFiles.length) {
        return;
      }

      nextIndex += 1;

      const result = await downloadFile(selectedFiles[index]);

      results[index] = result;
      completed += 1;

      if (completed % 100 === 0 || completed === selectedFiles.length) {
        console.log(
          `Progress: ${completed}/${selectedFiles.length}`,
        );
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, selectedFiles.length) },
    () => worker(),
  );

  await Promise.all(workers);

  return results;
}

function normalizePinyinSyllable(pinyin) {
  return pinyin
    .trim()
    .toLowerCase()
    .replace(/u:/g, "v")
    .replace(/ü/g, "v");
}

function createVocabularyManifest(vocabulary, hskAudio, syllableAudio) {
  const result = {};

  for (const entry of vocabulary) {
    const readings = (entry.readings ?? []).map((reading) => {
      const syllables = reading.pinyin
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((pinyin) => {
          const key = normalizePinyinSyllable(pinyin);

          return {
            pinyin,
            audioUrl: syllableAudio[key] ?? null,
          };
        });

      return {
        pinyin: reading.pinyin,
        syllables,
      };
    });

    result[entry.id] = {
      audioUrl: hskAudio[entry.simplified] ?? null,
      readings,
    };
  }

  return result;
}

function createCoverageReport(vocabulary, hskAudio, syllableAudio) {
  const missingWords = [];
  const missingSyllables = new Set();

  let matchedReadings = 0;
  let totalReadings = 0;
  let matchedSyllables = 0;
  let totalSyllables = 0;

  const hskLevels = {};

  for (let level = 1; level <= 6; level += 1) {
    hskLevels[level] = {
      total: 0,
      matched: 0,
      missing: 0,
    };
  }

  for (const entry of vocabulary) {
    const hasAudio = Boolean(hskAudio[entry.simplified]);

    if (!hasAudio) {
      missingWords.push({
        id: entry.id,
        simplified: entry.simplified,
        hskLevels: entry.hskLevels,
      });
    }

    for (const level of entry.hskLevels ?? []) {
      if (hskLevels[level]) {
        hskLevels[level].total += 1;

        if (hasAudio) {
          hskLevels[level].matched += 1;
        } else {
          hskLevels[level].missing += 1;
        }
      }
    }

    for (const reading of entry.readings ?? []) {
      totalReadings += 1;

      const syllables = reading.pinyin
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      let readingComplete = true;

      for (const pinyin of syllables) {
        totalSyllables += 1;

        const key = normalizePinyinSyllable(pinyin);

        if (syllableAudio[key]) {
          matchedSyllables += 1;
        } else {
          readingComplete = false;
          missingSyllables.add(key);
        }
      }

      if (readingComplete && syllables.length > 0) {
        matchedReadings += 1;
      }
    }
  }

  return {
    vocabularyTotal: vocabulary.length,
    vocabularyMatched: vocabulary.length - missingWords.length,
    vocabularyMissing: missingWords.length,
    vocabularyCoveragePercent: Number(
      (
        ((vocabulary.length - missingWords.length) / vocabulary.length) *
        100
      ).toFixed(2),
    ),
    readingsTotal: totalReadings,
    readingsWithAllSyllables: matchedReadings,
    syllablesTotal: totalSyllables,
    syllablesMatched: matchedSyllables,
    syllablesMissing: totalSyllables - matchedSyllables,
    missingSyllableKeys: [...missingSyllables].sort(),
    hskLevels,
    missingWords,
  };
}

async function writeJsonFile(path, data) {
  await mkdir(dirname(path), { recursive: true });

  await writeFile(
    path,
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
}

async function main() {
  console.log("Starting audio repository import...\n");

  if (
    !Number.isInteger(DOWNLOAD_LIMIT) &&
    DOWNLOAD_LIMIT !== Infinity
  ) {
    throw new Error("Invalid --limit value. Use --limit=5, for example.");
  }

  if (DOWNLOAD_LIMIT <= 0) {
    throw new Error("--limit must be greater than zero.");
  }

  const [files, rawVocabulary] = await Promise.all([
    fetchSourceFiles(),
    readFile(VOCABULARY_PATH, "utf8"),
  ]);

  const vocabulary = JSON.parse(rawVocabulary);

  if (!Array.isArray(vocabulary)) {
    throw new Error("Invalid vocabulary database: expected an array.");
  }

  const hskFiles = files.filter((file) => file.category === "hsk");
  const syllableFiles = files.filter(
    (file) => file.category === "syllables",
  );

  const hskAudio = Object.fromEntries(
    hskFiles.map((file) => [file.key, file.audioUrl]),
  );

  const syllableAudio = Object.fromEntries(
    syllableFiles.map((file) => [
      normalizePinyinSyllable(file.key),
      file.audioUrl,
    ]),
  );

  const vocabularyManifest = createVocabularyManifest(
    vocabulary,
    hskAudio,
    syllableAudio,
  );

  const coverage = createCoverageReport(
    vocabulary,
    hskAudio,
    syllableAudio,
  );

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: REPOSITORY,
    quality: QUALITY,
    hskAudio,
    syllableAudio,
    vocabulary: vocabularyManifest,
  };

  console.log("Downloading audio files...\n");

  const results = await downloadFiles(files);

  const downloaded = results.filter(
    (result) => result.status === "downloaded",
  ).length;

  const skipped = results.filter(
    (result) => result.status === "skipped",
  ).length;

  const failed = results.filter(
    (result) => result.status === "failed",
  );

  const report = {
    generatedAt: new Date().toISOString(),
    source: REPOSITORY,
    quality: QUALITY,
    sourceFileCount: files.length,
    selectedForDownload: results.length,
    downloaded,
    skipped,
    failed: failed.length,
    coverage,
    failedFiles: failed,
  };

  await writeJsonFile(MANIFEST_PATH, manifest);
  await writeJsonFile(REPORT_PATH, report);

  console.log("\nImport summary:");
  console.log(`Source files:       ${files.length}`);
  console.log(`Selected:           ${results.length}`);
  console.log(`Downloaded:         ${downloaded}`);
  console.log(`Skipped:            ${skipped}`);
  console.log(`Failed:             ${failed.length}`);

  console.log("\nVocabulary coverage:");
  console.log(
    `Matched:            ${coverage.vocabularyMatched}/${coverage.vocabularyTotal}`,
  );
  console.log(
    `Coverage:           ${coverage.vocabularyCoveragePercent}%`,
  );
  console.log(
    `Missing syllables:  ${coverage.missingSyllables}`,
  );

  console.log("\nHSK coverage:");

  for (const [level, data] of Object.entries(coverage.hskLevels)) {
    console.log(
      `HSK ${level}: ${data.matched}/${data.total} (missing: ${data.missing})`,
    );
  }

  console.log(`\nManifest: ${MANIFEST_PATH}`);
  console.log(`Report:    ${REPORT_PATH}`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

await main();
