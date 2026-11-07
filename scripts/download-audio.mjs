import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const CHARACTER_DATA_PATH = resolve(
  PROJECT_ROOT,
  "src/features/library/data/characters.json",
);

const AUDIO_DIRECTORY = resolve(PROJECT_ROOT, "public/audio/characters");

const REPORT_PATH = resolve(PROJECT_ROOT, "reports/audio-import-report.json");

const BASE_URL =
  "https://raw.githubusercontent.com/hugolpz/audio-cmn/master/64k";

const FORCE_DOWNLOAD = process.argv.includes("--force");

function getPinyinSlug(pinyin) {
  return pinyin
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getPinyinNumber(pinyin, tone) {
  return `${getPinyinSlug(pinyin)}${tone}`;
}

function mapCharacter(character) {
  return {
    id: character.id,
    character: character.simplified,
    pinyin: getPinyinNumber(character.pinyin, character.tone),
    file: `${character.id}.mp3`,
  };
}

function isValidMp3(buffer) {
  if (buffer.length < 4) {
    return false;
  }

  const hasId3Header =
    buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33;

  const hasMpegFrameHeader = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;

  return hasId3Header || hasMpegFrameHeader;
}

function getSourceCandidates(character) {
  const syllableUrl = `${BASE_URL}/syllabs/cmn-${character.pinyin}.mp3`;

  const hskUrl = `${BASE_URL}/hsk/cmn-${encodeURIComponent(character.character)}.mp3`;

  if (character.pinyin.endsWith("5")) {
    return [{ url: hskUrl, type: "hsk-character" }];
  }

  return [
    { url: syllableUrl, type: "syllable" },
    { url: hskUrl, type: "hsk-fallback" },
  ];
}

async function downloadCharacter(character) {
  const destination = resolve(AUDIO_DIRECTORY, character.file);

  if (!FORCE_DOWNLOAD) {
    try {
      const existingFile = await readFile(destination);

      if (isValidMp3(existingFile)) {
        return {
          ...character,
          status: "skipped",
          reason: "Valid file already exists",
        };
      }
    } catch {
      // File does not exist. Continue with download.
    }
  }

  for (const source of getSourceCandidates(character)) {
    let temporaryPath;

    try {
      const response = await fetch(source.url);

      if (!response.ok) {
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      if (!isValidMp3(buffer)) {
        throw new Error("Downloaded file is not a valid MP3.");
      }

      const hash = createHash("sha256").update(buffer).digest("hex");

      await mkdir(AUDIO_DIRECTORY, { recursive: true });

      temporaryPath = `${destination}.tmp`;

      await writeFile(temporaryPath, buffer);
      await rename(temporaryPath, destination);

      return {
        ...character,
        status: "downloaded",
        sourceType: source.type,
        sourceUrl: source.url,
        sizeBytes: buffer.length,
        sha256: hash,
      };
    } catch (error) {
      if (temporaryPath) {
        await rm(temporaryPath, { force: true }).catch(() => {});
      }

      if (error instanceof Error) {
        console.error(`Failed ${character.character}: ${error.message}`);
      }
    }
  }

  return {
    ...character,
    status: "failed",
    reason: "No valid audio source found",
  };
}

async function main() {
  console.log("Starting Mandarin audio import...\n");

  const rawData = await readFile(CHARACTER_DATA_PATH, "utf8");
  const characterData = JSON.parse(rawData);

  if (!Array.isArray(characterData)) {
    throw new Error("Invalid character database: expected an array.");
  }

  const characters = characterData.map(mapCharacter);

  const results = [];

  for (const character of characters) {
    const result = await downloadCharacter(character);

    results.push(result);

    console.log(
      `${result.status.toUpperCase().padEnd(10)} ${result.character} (${result.file})`,
    );
  }

  await mkdir(dirname(REPORT_PATH), { recursive: true });

  await writeFile(
    REPORT_PATH,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "hugolpz/audio-cmn",
        totalCharacters: characters.length,
        results,
      },
      null,
      2,
    ),
    "utf8",
  );

  const downloaded = results.filter(
    (result) => result.status === "downloaded",
  ).length;

  const skipped = results.filter(
    (result) => result.status === "skipped",
  ).length;

  const failed = results.filter((result) => result.status === "failed").length;

  console.log("\nImport summary:");
  console.log(`Total:      ${characters.length}`);
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Skipped:    ${skipped}`);
  console.log(`Failed:     ${failed}`);
  console.log(`Report:     ${REPORT_PATH}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

await main();
