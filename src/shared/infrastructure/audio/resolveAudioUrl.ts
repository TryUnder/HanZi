const AUDIO_BASE_URL = (import.meta.env.VITE_AUDIO_BASE_URL ?? "")
  .trim()
  .replace(/\/+$/, "");

const LOCAL_AUDIO_PREFIX = "/audio/";

const ALLOWED_STORAGE_CHARACTERS = /^[A-Za-z0-9_!.*'()&$=@;:+,? -]+$/;

/**
 * Must stay in sync with encodeStorageSegment()
 * in scripts/upload-audio-to-supabase.mjs.
 */
function encodeStorageSegment(segment: string): string {
  if (ALLOWED_STORAGE_CHARACTERS.test(segment)) {
    return segment;
  }

  const extensionMatch = segment.match(/\.[^./]+$/);
  const extension = extensionMatch?.[0] ?? "";
  const basename = extension ? segment.slice(0, -extension.length) : segment;

  const hexadecimal = Array.from(new TextEncoder().encode(basename), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

  return `u${hexadecimal}${extension}`;
}

/**
 * Converts an application audio path into a public Supabase Storage URL.
 *
 * Local paths remain unchanged when VITE_AUDIO_BASE_URL is not configured.
 * Blob URLs and other external URLs are never modified.
 */
export function resolveAudioUrl(audioUrl: string | null): string | null {
  if (!audioUrl || !AUDIO_BASE_URL) {
    return audioUrl;
  }

  if (!audioUrl.startsWith(LOCAL_AUDIO_PREFIX)) {
    return audioUrl;
  }

  const separatorIndex = audioUrl.search(/[?#]/);

  const pathname =
    separatorIndex === -1 ? audioUrl : audioUrl.slice(0, separatorIndex);

  const suffix = separatorIndex === -1 ? "" : audioUrl.slice(separatorIndex);

  const relativePath = pathname.slice(LOCAL_AUDIO_PREFIX.length);

  try {
    const storagePath = relativePath
      .split("/")
      .map((segment) => {
        const decodedSegment = decodeURIComponent(segment);
        const encodedSegment = encodeStorageSegment(decodedSegment);

        return encodeURIComponent(encodedSegment);
      })
      .join("/");

    return `${AUDIO_BASE_URL}/${storagePath}${suffix}`;
  } catch {
    // Keep the original URL if it cannot be safely resolved.
    return audioUrl;
  }
}
