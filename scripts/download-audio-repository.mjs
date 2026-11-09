import { createHash } from "node:crypto";
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createAudioUrl, normalizePinyinSyllable } from "./audioManifest.mjs";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const VOCABULARY_PATH = resolve(
  PROJECT_ROOT,
  "src/features/library/data/vocabulary.json",
);

const AUDIO_DIRECTORY = resolve(PROJECT_ROOT, "public/audio");

const REPORT_PATH = resolve(
  PROJECT_ROOT,
  "reports/audio-repository-import-report.json",
);

const REPOSITORY = "hugolpz/audio-cmn";
const BRANCH = "master";
const QUALITY = "64k";

const TREE_URL = `https://api.github.com/repos/${REPOSITORY}/git/trees/${BRANCH}?recursive=1`;

const RAW_BASE_URL = `https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}`;

const CONCURRENCY = 8;
const MAX_ATTEMPTS = 3;

const CATEGORY_DIRECTORIES = {
  hsk: "hsk",
  syllables: "syllables",
};

const ARGUMENTS = process.argv.slice(2);

function getOption(name) {
  const prefix = `--${name}=`;
  const argument = ARGUMENTS.find((value) => value.startsWith(prefix));

  return argument ? argument.slice(prefix.length) : null;
}

const FORCE_DOWNLOAD = ARGUMENTS.includes("--force");
const DRY_RUN = ARGUMENTS.includes("--dry-run");
const SYNC_VOCABULARY = ARGUMENTS.includes("--sync-vocabulary");
const CATEGORY = getOption("category");
const LIMIT_ARGUMENT = getOption("limit");

const DOWNLOAD_LIMIT = LIMIT_ARGUMENT ? Number(LIMIT_ARGUMENT) : Infinity;

function isValidMp3(buffer) {
  if (buffer.length < 4) {
    return false;
  }

  const hasId3Header =
    buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33;

  const hasMpegFrameHeader = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;

  return hasId3Header || hasMpegFrameHeader;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return "unknown size";
  }

  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function getAudioFileFromTree(entry) {
  const match = entry.path.match(/^64k\/(hsk|syllabs)\/([^/]+\.mp3)$/i);

  if (!match) {
    return null;
  }

  const category = match[1].toLowerCase() === "hsk" ? "hsk" : "syllables";
  const filename = match[2];

  return {
    category,
    filename,
    key: filename.replace(/^cmn-/i, "").replace(/\.mp3$/i, ""),
    sizeBytes: typeof entry.size === "number" ? entry.size : null,
    sourcePath: entry.path,
    sourceUrl: `${RAW_BASE_URL}/${entry.path
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    destination: resolve(
      AUDIO_DIRECTORY,
      CATEGORY_DIRECTORIES[category],
      filename,
    ),
    audioUrl: createAudioUrl(category, filename),
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
  const syllableFiles = files.filter((file) => file.category === "syllables");
  const totalBytes = files.reduce(
    (total, file) => total + (file.sizeBytes ?? 0),
    0,
  );

  console.log(
    `HSK recordings:      ${hskFiles.length} (${formatBytes(
      hskFiles.reduce((total, file) => total + (file.sizeBytes ?? 0), 0),
    )})`,
  );
  console.log(
    `Syllable recordings: ${syllableFiles.length} (${formatBytes(
      syllableFiles.reduce((total, file) => total + (file.sizeBytes ?? 0), 0),
    )})`,
  );
  console.log(
    `Total recordings:    ${files.length} (${formatBytes(totalBytes)})\n`,
  );

  return files;
}

/**
 * Builds lookup maps from remote or local file entries.
 * Invalid syllable filenames are excluded from the pronunciation catalog.
 */
function buildCatalog(files) {
  const hskAudio = {};
  const syllableAudio = {};
  const invalidSyllableFiles = [];

  for (const file of files) {
    if (file.category === "hsk") {
      hskAudio[file.key] = file.audioUrl;
      continue;
    }

    try {
      const key = normalizePinyinSyllable(file.key);
      syllableAudio[key] = file.audioUrl;
    } catch {
      invalidSyllableFiles.push({
        filename: file.filename,
        key: file.key,
        sourcePath: file.sourcePath ?? null,
      });
    }
  }

  return {
    hskAudio,
    syllableAudio,
    invalidSyllableFiles,
  };
}

/**
 * Scans local audio files and validates their MP3 headers.
 */
async function scanLocalCategory(category) {
  const directory = join(AUDIO_DIRECTORY, CATEGORY_DIRECTORIES[category]);

  let filenames;

  try {
    filenames = await readdir(directory);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {
        files: [],
        invalidFiles: [],
      };
    }

    throw error;
  }

  const files = [];
  const invalidFiles = [];

  for (const filename of filenames) {
    if (!/^cmn-.+\.mp3$/i.test(filename)) {
      continue;
    }

    const filePath = join(directory, filename);

    try {
      const buffer = await readFile(filePath);

      if (!isValidMp3(buffer)) {
        invalidFiles.push({
          category,
          filename,
          reason: "Invalid MP3 header or incomplete file.",
          sizeBytes: buffer.length,
        });

        continue;
      }

      files.push({
        category,
        filename,
        key: filename.replace(/^cmn-/i, "").replace(/\.mp3$/i, ""),
        audioUrl: createAudioUrl(category, filename),
        sizeBytes: buffer.length,
      });
    } catch (error) {
      invalidFiles.push({
        category,
        filename,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    files,
    invalidFiles,
  };
}

async function scanLocalCatalog() {
  const [hskResult, syllableResult] = await Promise.all([
    scanLocalCategory("hsk"),
    scanLocalCategory("syllables"),
  ]);

  const hskFiles = hskResult.files;
  const syllableFiles = syllableResult.files;

  return {
    hskFiles,
    syllableFiles,
    invalidFiles: [...hskResult.invalidFiles, ...syllableResult.invalidFiles],
    ...buildCatalog([...hskFiles, ...syllableFiles]),
  };
}

function createCoverageReport(
  vocabulary,
  hskAudio,
  syllableAudio,
  { includeMissingWords = true } = {},
) {
  const missingWords = [];
  const missingSyllables = new Set();

  let matchedReadings = 0;
  let totalReadings = 0;
  let matchedSyllables = 0;
  let totalSyllables = 0;
  let matchedWords = 0;
  let multiReadingEntries = 0;
  let entriesWithoutReadings = 0;

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

    if (hasAudio) {
      matchedWords += 1;
    } else if (includeMissingWords) {
      missingWords.push({
        id: entry.id,
        simplified: entry.simplified,
        hskLevels: entry.hskLevels,
      });
    }

    if ((entry.readings ?? []).length > 1) {
      multiReadingEntries += 1;
    }

    if ((entry.readings ?? []).length === 0) {
      entriesWithoutReadings += 1;
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

      const syllables = reading.pinyin.trim().split(/\s+/).filter(Boolean);

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
    vocabularyMatched: matchedWords,
    vocabularyMissing: vocabulary.length - matchedWords,
    vocabularyCoveragePercent: Number(
      ((matchedWords / vocabulary.length) * 100).toFixed(2),
    ),
    multiReadingEntries,
    entriesWithoutReadings,
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

async function formatJsonFile(data) {
  const { format } = await import("prettier");

  return format(JSON.stringify(data), { parser: "json" });
}

async function syncVocabularyAudio(vocabulary, hskAudio) {
  let updated = 0;
  let unchanged = 0;

  for (const entry of vocabulary) {
    const audioUrl = hskAudio[entry.simplified] ?? null;

    if (entry.audioUrl === audioUrl) {
      unchanged += 1;
      continue;
    }

    entry.audioUrl = audioUrl;
    updated += 1;
  }

  if (updated > 0) {
    await writeFile(VOCABULARY_PATH, await formatJsonFile(vocabulary), "utf8");
  }

  return { updated, unchanged };
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
      // File is missing or unreadable. Continue with download.
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
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      if (!isValidMp3(buffer)) {
        throw new Error("Downloaded file is not a valid MP3.");
      }

      const sha256 = createHash("sha256").update(buffer).digest("hex");

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
      lastError = error instanceof Error ? error.message : String(error);

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

  if (selectedFiles.length === 0) {
    return results;
  }

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
        console.log(`Progress: ${completed}/${selectedFiles.length}`);
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

function printCoverage(label, coverage) {
  console.log(`\n${label}`);
  console.log(
    `Word recordings:    ${coverage.vocabularyMatched}/${coverage.vocabularyTotal} (${coverage.vocabularyCoveragePercent}%)`,
  );
  console.log(
    `Complete readings:  ${coverage.readingsWithAllSyllables}/${coverage.readingsTotal}`,
  );
  console.log(
    `Syllable hits:      ${coverage.syllablesMatched}/${coverage.syllablesTotal} (missing: ${coverage.syllablesMissing})`,
  );

  console.log("HSK coverage:");

  for (const [level, data] of Object.entries(coverage.hskLevels)) {
    console.log(
      `  HSK ${level}: ${data.matched}/${data.total} (missing: ${data.missing})`,
    );
  }
}

async function main() {
  console.log("Starting audio repository import...\n");

  if (CATEGORY !== null && !Object.hasOwn(CATEGORY_DIRECTORIES, CATEGORY)) {
    throw new Error(
      `Invalid --category value "${CATEGORY}". Use --category=hsk or --category=syllables.`,
    );
  }

  if (!Number.isInteger(DOWNLOAD_LIMIT) && DOWNLOAD_LIMIT !== Infinity) {
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

  const sourceCatalog = buildCatalog(files);

  if (sourceCatalog.invalidSyllableFiles.length > 0) {
    console.warn(
      `Ignoring ${sourceCatalog.invalidSyllableFiles.length} syllable files with invalid Pinyin filenames.`,
    );
  }

  const sourceCoverage = createCoverageReport(
    vocabulary,
    sourceCatalog.hskAudio,
    sourceCatalog.syllableAudio,
  );

  // Invalid syllable filenames remain in the source report but are not downloaded.
  const invalidSourcePaths = new Set(
    sourceCatalog.invalidSyllableFiles.map((file) => file.sourcePath),
  );

  const downloadableFiles = files.filter(
    (file) => !invalidSourcePaths.has(file.sourcePath),
  );

  const selectedFiles = CATEGORY
    ? downloadableFiles.filter((file) => file.category === CATEGORY)
    : downloadableFiles;

  let results = [];

  if (DRY_RUN) {
    console.log("Dry run: skipping downloads.\n");
  } else {
    console.log("Downloading audio files...\n");
    results = await downloadFiles(selectedFiles);
  }

  const downloaded = results.filter(
    (result) => result.status === "downloaded",
  ).length;
  const skipped = results.filter(
    (result) => result.status === "skipped",
  ).length;
  const failed = results.filter((result) => result.status === "failed");

  const localCatalog = await scanLocalCatalog();

  const localCoverage = createCoverageReport(
    vocabulary,
    localCatalog.hskAudio,
    localCatalog.syllableAudio,
    { includeMissingWords: false },
  );

  let sync = null;

  if (SYNC_VOCABULARY && !DRY_RUN) {
    sync = await syncVocabularyAudio(vocabulary, localCatalog.hskAudio);
  } else if (SYNC_VOCABULARY && DRY_RUN) {
    console.log(
      "Dry run: skipping vocabulary synchronization to avoid modifying vocabulary.json.",
    );
  }

  const report = {
    generatedAt: new Date().toISOString(),
    source: REPOSITORY,
    quality: QUALITY,
    dryRun: DRY_RUN,
    category: CATEGORY,
    sourceFileCount: files.length,
    downloadableFileCount: downloadableFiles.length,
    invalidSyllableFiles: sourceCatalog.invalidSyllableFiles,
    selectedForDownload: DRY_RUN ? selectedFiles.length : results.length,
    downloaded,
    skipped,
    failed: failed.length,
    localFiles: {
      hsk: localCatalog.hskFiles.length,
      syllables: localCatalog.syllableFiles.length,
      invalid: localCatalog.invalidFiles.length,
    },
    invalidLocalFiles: localCatalog.invalidFiles,
    sourceCoverage,
    localCoverage,
    vocabularySync: sync,
    failedFiles: failed,
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log("\nImport summary:");
  console.log(`Source files:       ${files.length}`);
  console.log(`Downloadable:       ${downloadableFiles.length}`);
  console.log(`Selected:           ${selectedFiles.length}`);
  console.log(`Downloaded:         ${downloaded}`);
  console.log(`Skipped:            ${skipped}`);
  console.log(`Failed:             ${failed.length}`);
  console.log(
    `Local files:        ${localCatalog.hskFiles.length} HSK, ${localCatalog.syllableFiles.length} syllables`,
  );
  console.log(
    `Invalid syllables:  ${sourceCatalog.invalidSyllableFiles.length}`,
  );
  console.log(`Invalid local:      ${localCatalog.invalidFiles.length}`);

  if (localCatalog.invalidFiles.length > 0) {
    console.warn("\nInvalid local audio files:");

    for (const file of localCatalog.invalidFiles) {
      console.warn(`  ${file.category}/${file.filename}: ${file.reason}`);
    }
  }

  printCoverage(
    "Source coverage (what the repository offers):",
    sourceCoverage,
  );

  printCoverage("Local coverage (what the app can serve now):", localCoverage);

  if (sync) {
    console.log(
      `\nvocabulary.json:    ${sync.updated} updated, ${sync.unchanged} unchanged`,
    );
  } else {
    console.log(
      "\nHint: run with --sync-vocabulary to write local audio URLs into vocabulary.json.",
    );
  }

  console.log(`\nReport: ${REPORT_PATH}`);

  if (failed.length > 0 || localCatalog.invalidFiles.length > 0) {
    process.exitCode = 1;
  }
}

await main();
