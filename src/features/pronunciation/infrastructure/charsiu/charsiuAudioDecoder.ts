import { decodeToMono16k } from "charsiu-js/assets-web";

export type AudioDecodingErrorCode = "EMPTY_AUDIO" | "INVALID_AUDIO";

export class AudioDecodingError extends Error {
  public readonly code: AudioDecodingErrorCode;

  constructor(code: AudioDecodingErrorCode, message: string) {
    super(message);

    this.name = "AudioDecodingError";
    this.code = code;
  }
}

export async function decodeRecordingToMono16k(
  recording: Blob,
): Promise<Float32Array> {
  if (recording.size === 0) {
    throw new AudioDecodingError(
      "EMPTY_AUDIO",
      "The audio recording is empty.",
    );
  }

  try {
    const arrayBuffer = await recording.arrayBuffer();
    const waveform = await decodeToMono16k(arrayBuffer);

    if (
      waveform.length === 0 ||
      waveform.some((sample) => !Number.isFinite(sample)) ||
      waveform.every((sample) => sample === 0)
    ) {
      throw new AudioDecodingError(
        "INVALID_AUDIO",
        "The recording does not contain usable audio samples.",
      );
    }

    return waveform;
  } catch (error) {
    if (error instanceof AudioDecodingError) {
      throw error;
    }

    throw new AudioDecodingError(
      "INVALID_AUDIO",
      error instanceof Error
        ? error.message
        : "Could not decode the audio recording.",
    );
  }
}
