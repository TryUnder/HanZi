import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_DIRECTORY = resolve(PROJECT_ROOT, "public/audio/syllables");
const DESTINATION_DIRECTORY = resolve(PROJECT_ROOT, "public/audio/mandarin");

const TONES = [1, 2, 3, 4];

function isValidMp3(buffer) {
  if (buffer.length < 4) {
    return false;
  }

  const hasId3Header =
    buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33;

  const hasMpegFrameHeader = buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0;

  return hasId3Header || hasMpegFrameHeader;
}

async function syncToneAudio() {
  console.log("Synchronizing Mandarin tone demonstrations...\n");

  await mkdir(DESTINATION_DIRECTORY, { recursive: true });

  for (const tone of TONES) {
    const filename = `cmn-ma${tone}.mp3`;
    const sourcePath = resolve(SOURCE_DIRECTORY, filename);
    const destinationPath = resolve(DESTINATION_DIRECTORY, `ma${tone}.mp3`);

    const sourceBuffer = await readFile(sourcePath);

    if (!isValidMp3(sourceBuffer)) {
      throw new Error(`Invalid MP3 source file: ${sourcePath}`);
    }

    await copyFile(sourcePath, destinationPath);

    console.log(`COPIED     ma${tone}.mp3`);
  }

  console.log(`\nSynchronized ${TONES.length} tone demonstrations.`);
}

await syncToneAudio();
