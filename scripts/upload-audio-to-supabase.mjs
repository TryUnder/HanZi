
import { createClient } from "@supabase/supabase-js";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const AUDIO_DIRECTORY = path.join(PROJECT_ROOT, "public", "audio");
const BUCKET_NAME = "hanzi-audio";
const CACHE_CONTROL = "31536000";
const CONCURRENCY = 4;

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.",
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

async function collectAudioFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectAudioFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".mp3")) {
      files.push(fullPath);
    }
  }

  return files;
}

function encodeStorageSegment(segment) {
  const allowedCharacters = /^[A-Za-z0-9_!.*'()&$=@;:+,? -]+$/;

  if (allowedCharacters.test(segment)) {
    return segment;
  }

  const extension = path.extname(segment);
  const basename = segment.slice(0, -extension.length);

  return `u${Buffer.from(basename, "utf8").toString("hex")}${extension}`;
}

function getStoragePath(filePath) {
  return path
    .relative(AUDIO_DIRECTORY, filePath)
    .split(path.sep)
    .map(encodeStorageSegment)
    .join("/");
}

function isAlreadyUploaded(error) {
  const message = error.message ?? "";

  return (
    error.statusCode === "409" ||
    error.statusCode === 409 ||
    error.error === "Duplicate" ||
    /already exists|duplicate/i.test(message)
  );
}

async function uploadFile(filePath) {
  const storagePath = getStoragePath(filePath);
  const fileBuffer = await readFile(filePath);

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: "audio/mpeg",
      cacheControl: CACHE_CONTROL,
      upsert: false,
    });

  if (error) {
    if (isAlreadyUploaded(error)) {
      return "skipped";
    }

    throw new Error(`${storagePath}: ${error.message}`);
  }

  return "uploaded";
}

async function main() {
  console.log("HanZi audio upload");
  console.log(`Bucket: ${BUCKET_NAME}`);
  console.log(`Source: ${AUDIO_DIRECTORY}\n`);

  const files = await collectAudioFiles(AUDIO_DIRECTORY);

  if (files.length === 0) {
    throw new Error("No MP3 files found in public/audio.");
  }

  console.log(`Found ${files.length} MP3 files.\n`);

  const results = {
    uploaded: 0,
    skipped: 0,
    failed: 0,
  };

  const errors = [];
  let nextIndex = 0;
  let completed = 0;

  async function worker() {
    while (nextIndex < files.length) {
      const index = nextIndex;
      nextIndex += 1;

      const filePath = files[index];

      try {
        const result = await uploadFile(filePath);
        results[result] += 1;
      } catch (error) {
        results.failed += 1;
        const errorMessage =
  error instanceof Error ? error.message : String(error);

errors.push(errorMessage);

if (errors.length <= 10) {
  console.error(`Upload error: ${errorMessage}`);
}
      }

      completed += 1;

      if (completed % 100 === 0 || completed === files.length) {
        const percentage = Math.round((completed / files.length) * 100);

        console.log(
          `[${completed}/${files.length}] ${percentage}% | ` +
            `uploaded: ${results.uploaded} | ` +
            `skipped: ${results.skipped} | ` +
            `failed: ${results.failed}`,
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: CONCURRENCY }, () => worker()),
  );

  console.log("\nUpload summary");
  console.log("------------------------------");
  console.log(`Total:    ${files.length}`);
  console.log(`Uploaded: ${results.uploaded}`);
  console.log(`Skipped:  ${results.skipped}`);
  console.log(`Failed:   ${results.failed}`);

  if (errors.length > 0) {
    console.error("\nUpload errors:");

    for (const error of errors) {
      console.error(`- ${error}`);
    }

    process.exitCode = 1;
    return;
  }

  console.log("\nAll audio files are available in the upload bucket.");
}

await main();
