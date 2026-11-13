import * as ort from "onnxruntime-web";
import { forcedAlign, normalize, softmaxRows } from "charsiu-js";

import type {
  ForcedAlignmentErrorCode,
  ForcedAlignmentResponse,
  FramePhoneAlignment,
} from "../../domain/models/forcedAlignment";
import type { PhonemizedPronunciation } from "../../domain/models/phoneme";
import { getCharsiuModel } from "./charsiuModelProvider";

const FRAME_DURATION_SECONDS = 0.01;
const SILENCE_THRESHOLD_FRAMES = 4;

interface ModelOutput {
  readonly frames: number;
  readonly vocabularySize: number;
  readonly probabilities: Float32Array;
}

function failure(
  code: ForcedAlignmentErrorCode,
  message: string,
): ForcedAlignmentResponse {
  return {
    success: false,
    error: { code, message },
  };
}

function validateWaveform(
  waveform: Float32Array,
): ForcedAlignmentResponse | null {
  if (waveform.length === 0) {
    return failure("EMPTY_AUDIO", "The audio recording is empty.");
  }

  if (
    waveform.some((sample) => !Number.isFinite(sample)) ||
    waveform.every((sample) => sample === 0)
  ) {
    return failure(
      "INVALID_AUDIO",
      "The audio recording contains invalid or silent samples.",
    );
  }

  return null;
}

function validatePronunciation(
  pronunciation: PhonemizedPronunciation,
): ForcedAlignmentResponse | null {
  if (
    pronunciation.syllables <= 0 ||
    !Number.isInteger(pronunciation.syllables) ||
    pronunciation.phonemes.length === 0 ||
    pronunciation.phoneIds.length === 0
  ) {
    return failure("EMPTY_TARGET", "The target pronunciation is empty.");
  }

  if (pronunciation.phonemes.length !== pronunciation.phoneIds.length) {
    return failure(
      "INVALID_ALIGNMENT",
      "The phoneme metadata and phone ID sequences have different lengths.",
    );
  }

  for (let index = 0; index < pronunciation.phoneIds.length; index += 1) {
    const phoneId = pronunciation.phoneIds[index];
    const phoneme = pronunciation.phonemes[index];

    if (
      phoneId === undefined ||
      phoneme === undefined ||
      !Number.isInteger(phoneId) ||
      phoneId < 0 ||
      phoneme.vocabularyId !== phoneId
    ) {
      return failure(
        "INVALID_ALIGNMENT",
        `The target phoneme at index ${index} is invalid.`,
      );
    }
  }

  return null;
}

function extractModelOutput(
  output: Record<string, ort.Tensor>,
): ModelOutput | null {
  const logits = output.logits;

  if (logits === undefined || logits.dims.length !== 3) {
    return null;
  }

  const [batchSize, frames, vocabularySize] = logits.dims;

  if (
    batchSize !== 1 ||
    frames === undefined ||
    frames <= 0 ||
    vocabularySize === undefined ||
    vocabularySize <= 0 ||
    logits.data.length !== frames * vocabularySize
  ) {
    return null;
  }

  if (!(logits.data instanceof Float32Array)) {
    return null;
  }

  const rawLogits = logits.data;

  for (let index = 0; index < rawLogits.length; index += 1) {
    const value = rawLogits[index];

    if (value === undefined || !Number.isFinite(value)) {
      return null;
    }
  }

  const probabilities = softmaxRows(rawLogits, frames, vocabularySize);

  if (
    probabilities.length !== frames * vocabularySize ||
    probabilities.some(
      (probability) =>
        !Number.isFinite(probability) || probability < 0 || probability > 1,
    )
  ) {
    return null;
  }

  return {
    frames,
    vocabularySize,
    probabilities,
  };
}

function findPredictedPhones(
  probabilities: Float32Array,
  frames: number,
  vocabularySize: number,
): Int32Array {
  const predictions = new Int32Array(frames);

  for (let frame = 0; frame < frames; frame += 1) {
    const offset = frame * vocabularySize;
    let bestPhone = 0;
    let bestProbability = -Infinity;

    for (let phone = 0; phone < vocabularySize; phone += 1) {
      const probability = probabilities[offset + phone];

      if (probability !== undefined && probability > bestProbability) {
        bestProbability = probability;
        bestPhone = phone;
      }
    }

    predictions[frame] = bestPhone;
  }

  return predictions;
}

/**
 * Matches Charsiu's silence handling:
 * short silence runs are treated as speech, while longer runs
 * are excluded from forced alignment.
 */
function findSpeechFrames(
  predictions: Int32Array,
  silenceTokenId: number,
): number[] {
  const speechFrames: number[] = [];

  for (let start = 0; start < predictions.length;) {
    const predictedPhone = predictions[start];

    if (predictedPhone === undefined) {
      break;
    }

    let end = start + 1;

    while (end < predictions.length && predictions[end] === predictedPhone) {
      end += 1;
    }

    const runLength = end - start;
    const isLongSilence =
      predictedPhone === silenceTokenId &&
      runLength >= SILENCE_THRESHOLD_FRAMES;

    if (!isLongSilence) {
      for (let frame = start; frame < end; frame += 1) {
        speechFrames.push(frame);
      }
    }

    start = end;
  }

  return speechFrames;
}

function buildFrameAlignments(
  probabilities: Float32Array,
  frames: number,
  vocabularySize: number,
  silenceTokenId: number,
  speechFrames: readonly number[],
  phoneAlignment: Int32Array,
  phoneIds: readonly number[],
): FramePhoneAlignment[] | null {
  const speechPhoneIndexes = new Int32Array(frames).fill(-1);

  for (let index = 0; index < speechFrames.length; index += 1) {
    const frameIndex = speechFrames[index];
    const phoneIndex = phoneAlignment[index];

    if (
      frameIndex === undefined ||
      phoneIndex === undefined ||
      phoneIndex < 0 ||
      phoneIndex >= phoneIds.length
    ) {
      return null;
    }

    speechPhoneIndexes[frameIndex] = phoneIndex;
  }

  const result: FramePhoneAlignment[] = [];

  for (let frameIndex = 0; frameIndex < frames; frameIndex += 1) {
    const offset = frameIndex * vocabularySize;
    const targetPhoneIndex = speechPhoneIndexes[frameIndex];

    if (targetPhoneIndex === undefined) {
      return null;
    }

    if (targetPhoneIndex === -1) {
      const silenceConfidence = probabilities[offset + silenceTokenId];

      if (silenceConfidence === undefined) {
        return null;
      }

      result.push({
        frameIndex,
        timeSeconds: frameIndex * FRAME_DURATION_SECONDS,
        targetPhoneIndex: null,
        confidence: silenceConfidence,
        isSilence: true,
      });

      continue;
    }

    const phoneId = phoneIds[targetPhoneIndex];

    if (phoneId === undefined) {
      return null;
    }

    const confidence = probabilities[offset + phoneId];

    if (confidence === undefined || !Number.isFinite(confidence)) {
      return null;
    }

    result.push({
      frameIndex,
      timeSeconds: frameIndex * FRAME_DURATION_SECONDS,
      targetPhoneIndex,
      confidence,
      isSilence: false,
    });
  }

  return result;
}

function validatePhoneAlignment(
  alignment: Int32Array,
  targetPhoneCount: number,
): boolean {
  if (alignment.length === 0 || targetPhoneCount <= 0) {
    return false;
  }

  const visitedPhones = new Set<number>();
  let previousPhoneIndex = -1;

  for (const phoneIndex of alignment) {
    if (
      phoneIndex < 0 ||
      phoneIndex >= targetPhoneCount ||
      phoneIndex < previousPhoneIndex
    ) {
      return false;
    }

    visitedPhones.add(phoneIndex);
    previousPhoneIndex = phoneIndex;
  }

  return visitedPhones.size === targetPhoneCount;
}

export async function alignRecordingToPronunciation(
  waveform: Float32Array,
  pronunciation: PhonemizedPronunciation,
): Promise<ForcedAlignmentResponse> {
  const audioError = validateWaveform(waveform);

  if (audioError !== null) {
    return audioError;
  }

  const pronunciationError = validatePronunciation(pronunciation);

  if (pronunciationError !== null) {
    return pronunciationError;
  }

  let model: Awaited<ReturnType<typeof getCharsiuModel>>;

  try {
    model = await getCharsiuModel();
  } catch {
    return failure(
      "MODEL_UNAVAILABLE",
      "The pronunciation model could not be loaded.",
    );
  }

  const silenceTokenId = model.phoneVocabulary["[SIL]"];

  if (
    silenceTokenId === undefined ||
    !Number.isInteger(silenceTokenId) ||
    silenceTokenId < 0
  ) {
    return failure(
      "MISSING_SILENCE_TOKEN",
      "The Charsiu phone vocabulary does not contain a valid [SIL] token.",
    );
  }

  const phoneIds = pronunciation.phoneIds;

  const knownPhoneIds = new Set(Object.values(model.phoneVocabulary));

  if (
    phoneIds.some(
      (phoneId) => !knownPhoneIds.has(phoneId) || phoneId === silenceTokenId,
    )
  ) {
    return failure(
      "INVALID_ALIGNMENT",
      "The target pronunciation contains an invalid phone ID.",
    );
  }

  let output: Record<string, ort.Tensor>;

  try {
    const normalizedWaveform = normalize(waveform);

    const inputTensor = new ort.Tensor("float32", normalizedWaveform, [
      1,
      normalizedWaveform.length,
    ]);

    output = await model.session.run({
      input_values: inputTensor,
    });
  } catch {
    return failure(
      "MODEL_INFERENCE_FAILED",
      "The pronunciation model failed while processing the recording.",
    );
  }

  const modelOutput = extractModelOutput(output);

  if (modelOutput === null) {
    return failure(
      "INVALID_MODEL_OUTPUT",
      "The pronunciation model returned an invalid output tensor.",
    );
  }

  const { frames, vocabularySize, probabilities } = modelOutput;

  if (silenceTokenId >= vocabularySize) {
    return failure(
      "MISSING_SILENCE_TOKEN",
      "The [SIL] token ID is outside the model output vocabulary.",
    );
  }

  if (phoneIds.some((phoneId) => phoneId >= vocabularySize)) {
    return failure(
      "INVALID_ALIGNMENT",
      "A target phone ID is outside the model output vocabulary.",
    );
  }

  const predictions = findPredictedPhones(
    probabilities,
    frames,
    vocabularySize,
  );

  const speechFrames = findSpeechFrames(predictions, silenceTokenId);

  if (speechFrames.length < phoneIds.length) {
    return failure(
      "TOO_FEW_FRAMES",
      "The recording does not contain enough speech frames to align all target phonemes.",
    );
  }

  const compactProbabilities = new Float32Array(
    speechFrames.length * vocabularySize,
  );

  for (let index = 0; index < speechFrames.length; index += 1) {
    const frameIndex = speechFrames[index];

    if (frameIndex === undefined) {
      return failure(
        "INVALID_ALIGNMENT",
        "The speech frame sequence is incomplete.",
      );
    }

    const sourceOffset = frameIndex * vocabularySize;
    const targetOffset = index * vocabularySize;

    compactProbabilities.set(
      probabilities.subarray(sourceOffset, sourceOffset + vocabularySize),
      targetOffset,
    );
  }

  let phoneAlignment: Int32Array;

  try {
    phoneAlignment = forcedAlign(
      compactProbabilities,
      speechFrames.length,
      vocabularySize,
      [...phoneIds],
    );
  } catch {
    return failure(
      "INVALID_ALIGNMENT",
      "The forced alignment algorithm could not align the target phonemes.",
    );
  }

  if (!validatePhoneAlignment(phoneAlignment, phoneIds.length)) {
    return failure(
      "INVALID_ALIGNMENT",
      "The forced alignment result contains invalid phoneme positions.",
    );
  }

  const alignedFrames = buildFrameAlignments(
    probabilities,
    frames,
    vocabularySize,
    silenceTokenId,
    speechFrames,
    phoneAlignment,
    phoneIds,
  );

  if (alignedFrames === null) {
    return failure(
      "INVALID_ALIGNMENT",
      "The aligned frame sequence could not be reconstructed.",
    );
  }

  const speechFrameCount = alignedFrames.filter(
    (frame) => !frame.isSilence,
  ).length;

  const alignedFrameCount = alignedFrames.filter(
    (frame) => frame.targetPhoneIndex !== null,
  ).length;

  return {
    success: true,
    alignment: {
      durationSeconds: frames * FRAME_DURATION_SECONDS,
      frameDurationSeconds: FRAME_DURATION_SECONDS,
      frames: alignedFrames,
      speechFrameCount,
      alignedFrameCount,
    },
  };
}
