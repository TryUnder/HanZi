import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const AUDIO_DIRECTORY = resolve(PROJECT_ROOT, "public/audio/characters");

const REPORT_PATH = resolve(PROJECT_ROOT, "reports/audio-import-report.json");

const BASE_URL =
  "https://raw.githubusercontent.com/hugolpz/audio-cmn/master/64k";

const FORCE_DOWNLOAD = process.argv.includes("--force");

const characters = [
  { id: "ni", character: "你", pinyin: "ni3", file: "ni.mp3" },
  { id: "hao", character: "好", pinyin: "hao3", file: "hao.mp3" },
  { id: "wo", character: "我", pinyin: "wo3", file: "wo.mp3" },
  { id: "shi", character: "是", pinyin: "shi4", file: "shi.mp3" },
  { id: "bu", character: "不", pinyin: "bu4", file: "bu.mp3" },
  { id: "ren", character: "人", pinyin: "ren2", file: "ren.mp3" },
  { id: "zhong", character: "中", pinyin: "zhong1", file: "zhong.mp3" },
  { id: "guo", character: "国", pinyin: "guo2", file: "guo.mp3" },
  { id: "xue", character: "学", pinyin: "xue2", file: "xue.mp3" },
  { id: "sheng", character: "生", pinyin: "sheng1", file: "sheng.mp3" },
  { id: "ma", character: "吗", pinyin: "ma5", file: "ma.mp3" },
  { id: "zai", character: "在", pinyin: "zai4", file: "zai.mp3" },
];

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
          id: character.id,
          character: character.character,
          file: character.file,
          status: "skipped",
          reason: "Valid file already exists",
        };
      }
    } catch {
      // File does not exist. Continue with download.
    }
  }

  for (const source of getSourceCandidates(character)) {
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

      const temporaryPath = `${destination}.tmp`;

      await writeFile(temporaryPath, buffer);
      await rename(temporaryPath, destination);

      return {
        id: character.id,
        character: character.character,
        pinyin: character.pinyin,
        file: character.file,
        status: "downloaded",
        sourceType: source.type,
        sourceUrl: source.url,
        sizeBytes: buffer.length,
        sha256: hash,
      };
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Failed ${character.character}: ${error.message}`);
      }
    }
  }

  return {
    id: character.id,
    character: character.character,
    file: character.file,
    status: "failed",
    reason: "No valid audio source found",
  };
}

async function main() {
  console.log("Starting Mandarin audio import...\n");

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
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Skipped:    ${skipped}`);
  console.log(`Failed:     ${failed}`);
  console.log(`Report:     ${REPORT_PATH}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

await main();
