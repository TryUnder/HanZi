import * as ort from "onnxruntime-web";
import { forcedAlign, normalize, softmaxRows } from "charsiu-js";

import type {
  ForcedAlignmentErrorCode,
  ForcedAlignmentResponse,
} from "../../domain/models/forcedAlignment";

import type { FramePhoneAlignment } from "../../domain/models/forcedAlignment";

export interface CharsiuForcedAlignmentOptions {
  readonly session: ort.InferenceSession;
  readonly waveform16k: Float32Array;
  readonly targetPhoneIds: readonly number[];
  readonly phoneVocabulary: Readonly<Record<string, number>>;
  readonly resolutionSeconds?: number;
  readonly silenceThresholdFrames?: number;
}

interface ModelOutput {
  readonly data: ArrayLike<number>;
  readonly dims: readonly number[];
}

const DEFAULT_RESOLUTION_SECONDS = 0.01;
const DEFAULT_SILENCE_THRESHOLD_FRAMES = 4;

function failure(
  code: ForcedAlignmentErrorCode,
  message: string,
): ForcedAlignmentResponse {
  return {
    success: false,
    error: { code, message },
  };
}

function getArgmax(
  probabilities: Float32Array,
  frameOffset: number,
  vocabularySize: number,
): number {
  let bestIndex = 0;
  let bestValue = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < vocabularySize; index += 1) {
    const value = probabilities[frameOffset + index];

    if (value !== undefined && value > bestValue) {
      bestValue = value;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function createSilenceMask(
  predictions: Int32Array,
  silenceId: number,
  threshold: number,
): Int32Array {
  const mask = new Int32Array(predictions.length);

  for (let start = 0; start < predictions.length;) {
    const prediction = predictions[start];

    if (prediction === undefined) {
      break;
    }

    let end = start;

    while (end < predictions.length && predictions[end] === prediction) {
      end += 1;
    }

    const isShortSilence = prediction === silenceId && end - start < threshold;

    for (let index = start; index < end; index += 1) {
      mask[index] = isShortSilence ? -1 : prediction;
    }

    start = end;
  }

  return mask;
}

export async function alignAudioToPhones(
  options: CharsiuForcedAlignmentOptions,
): Promise<ForcedAlignmentResponse> {
  const {
    session,
    waveform16k,
    targetPhoneIds,
    phoneVocabulary,
    resolutionSeconds = DEFAULT_RESOLUTION_SECONDS,
    silenceThresholdFrames = DEFAULT_SILENCE_THRESHOLD_FRAMES,
  } = options;

  if (waveform16k.length === 0) {
    return failure("EMPTY_AUDIO", "The audio recording is empty.");
  }

  if (
    !Number.isFinite(resolutionSeconds) ||
    resolutionSeconds <= 0 ||
    !Number.isInteger(silenceThresholdFrames) ||
    silenceThresholdFrames < 1
  ) {
    return failure("INVALID_AUDIO", "Invalid audio alignment configuration.");
  }

  if (
    waveform16k.some((sample) => !Number.isFinite(sample)) ||
    waveform16k.every((sample) => sample === 0)
  ) {
    return failure(
      "INVALID_AUDIO",
      "The recording does not contain usable audio samples.",
    );
  }

  if (targetPhoneIds.length === 0) {
    return failure("EMPTY_TARGET", "The target pronunciation is empty.");
  }

  if (
    targetPhoneIds.some((phoneId) => !Number.isInteger(phoneId) || phoneId < 0)
  ) {
    return failure(
      "INVALID_MODEL_OUTPUT",
      "The target phone sequence contains invalid phone IDs.",
    );
  }

  const silenceId = phoneVocabulary["[SIL]"];

  if (
    silenceId === undefined ||
    !Number.isInteger(silenceId) ||
    silenceId < 0
  ) {
    return failure(
      "MISSING_SILENCE_TOKEN",
      'The model vocabulary does not contain a valid "[SIL]" token.',
    );
  }

  try {
    const normalizedWaveform = normalize(waveform16k);

    const inputTensor = new ort.Tensor("float32", normalizedWaveform, [
      1,
      normalizedWaveform.length,
    ]);

    const outputs = await session.run({
      input_values: inputTensor,
    });

    const logits = outputs.logits as ort.Tensor | undefined;

    if (!logits || logits.dims.length !== 3) {
      return failure(
        "INVALID_MODEL_OUTPUT",
        'The model did not return a three-dimensional "logits" tensor.',
      );
    }

    const [batchSize, frameCount, vocabularySize] = logits.dims;

    if (
      batchSize !== 1 ||
      frameCount === undefined ||
      vocabularySize === undefined ||
      frameCount < 1 ||
      vocabularySize < 1 ||
      logits.data.length !== frameCount * vocabularySize
    ) {
      return failure(
        "INVALID_MODEL_OUTPUT",
        "The model returned invalid output dimensions.",
      );
    }

    const modelOutput = logits as unknown as ModelOutput;

    if (!Array.from(modelOutput.data).every(Number.isFinite)) {
      return failure(
        "INVALID_MODEL_OUTPUT",
        "The model returned non-finite logits.",
      );
    }

    if (
      silenceId >= vocabularySize ||
      targetPhoneIds.some((phoneId) => phoneId >= vocabularySize)
    ) {
      return failure(
        "INVALID_MODEL_OUTPUT",
        "The target phone IDs do not match the model output vocabulary.",
      );
    }

    const probabilities = softmaxRows(
      modelOutput.data,
      frameCount,
      vocabularySize,
    );

    if (
      probabilities.length !== frameCount * vocabularySize ||
      !Array.from(probabilities).every(
        (value) => Number.isFinite(value) && value >= 0 && value <= 1,
      )
    ) {
      return failure(
        "INVALID_MODEL_OUTPUT",
        "The model returned invalid probability values.",
      );
    }

    const predictions = new Int32Array(frameCount);

    for (let frame = 0; frame < frameCount; frame += 1) {
      predictions[frame] = getArgmax(
        probabilities,
        frame * vocabularySize,
        vocabularySize,
      );
    }

    const silenceMask = createSilenceMask(
      predictions,
      silenceId,
      silenceThresholdFrames,
    );

    const speechFrames: number[] = [];

    for (let frame = 0; frame < frameCount; frame += 1) {
      if (silenceMask[frame] !== silenceId) {
        speechFrames.push(frame);
      }
    }

    if (speechFrames.length < targetPhoneIds.length) {
      return failure(
        "TOO_FEW_FRAMES",
        "There are fewer speech frames than target phonemes.",
      );
    }

    const compactProbabilities = new Float32Array(
      speechFrames.length * vocabularySize,
    );

    for (
      let compactIndex = 0;
      compactIndex < speechFrames.length;
      compactIndex += 1
    ) {
      const originalFrame = speechFrames[compactIndex];

      if (originalFrame === undefined) {
        return failure(
          "INVALID_ALIGNMENT",
          "Could not map a speech frame to the original recording.",
        );
      }

      const sourceOffset = originalFrame * vocabularySize;
      const targetOffset = compactIndex * vocabularySize;

      compactProbabilities.set(
        probabilities.subarray(sourceOffset, sourceOffset + vocabularySize),
        targetOffset,
      );
    }

    const targetIds = [...targetPhoneIds];

    const targetFrameIndexes = forcedAlign(
      compactProbabilities,
      speechFrames.length,
      vocabularySize,
      targetIds,
    );

    if (
      targetFrameIndexes.length !== speechFrames.length ||
      Array.from(targetFrameIndexes).some(
        (index) =>
          !Number.isInteger(index) || index < 0 || index >= targetIds.length,
      )
    ) {
      return failure(
        "INVALID_ALIGNMENT",
        "The forced alignment returned invalid target indexes.",
      );
    }

    const alignedByFrame = new Map<
      number,
      {
        targetPhoneIndex: number;
        confidence: number;
      }
    >();

    for (
      let compactIndex = 0;
      compactIndex < speechFrames.length;
      compactIndex += 1
    ) {
      const originalFrame = speechFrames[compactIndex];
      const targetPhoneIndex = targetFrameIndexes[compactIndex];

      if (originalFrame === undefined || targetPhoneIndex === undefined) {
        return failure(
          "INVALID_ALIGNMENT",
          "The alignment contains a missing frame or phone index.",
        );
      }

      const phoneId = targetIds[targetPhoneIndex];

      if (phoneId === undefined) {
        return failure(
          "INVALID_ALIGNMENT",
          "The alignment refers to a missing target phoneme.",
        );
      }

      const probability =
        probabilities[originalFrame * vocabularySize + phoneId];

      if (probability === undefined || !Number.isFinite(probability)) {
        return failure(
          "INVALID_ALIGNMENT",
          "Could not calculate alignment confidence.",
        );
      }

      alignedByFrame.set(originalFrame, {
        targetPhoneIndex,
        confidence: probability,
      });
    }

    const frames: FramePhoneAlignment[] = [];

    for (let frame = 0; frame < frameCount; frame += 1) {
      const aligned = alignedByFrame.get(frame);
      const isSilence = silenceMask[frame] === silenceId;

      frames.push({
        frameIndex: frame,
        timeSeconds: frame * resolutionSeconds,
        targetPhoneIndex: aligned?.targetPhoneIndex ?? null,
        confidence: aligned?.confidence ?? 0,
        isSilence,
      });
    }

    return {
      success: true,
      alignment: {
        durationSeconds: frameCount * resolutionSeconds,
        frameDurationSeconds: resolutionSeconds,
        frames,
        speechFrameCount: speechFrames.length,
        alignedFrameCount: alignedByFrame.size,
      },
    };
  } catch (error) {
    return failure(
      "INVALID_ALIGNMENT",
      error instanceof Error
        ? error.message
        : "An unexpected error occurred during forced alignment.",
    );
  }
}
