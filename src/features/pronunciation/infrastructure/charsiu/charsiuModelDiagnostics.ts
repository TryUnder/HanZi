
import * as ort from "onnxruntime-web";

import { getCharsiuModel } from "./charsiuModelProvider";

export interface CharsiuModelDiagnostics {
  readonly success: boolean;
  readonly model: {
    readonly inputNames: readonly string[];
    readonly outputNames: readonly string[];
    readonly phoneCount: number;
    readonly silenceTokenId: number | null;
    readonly unknownTokenId: number | null;
  };
  readonly inference: {
    readonly outputDimensions: readonly number[];
    readonly outputValueCount: number;
    readonly hasFiniteValues: boolean;
  } | null;
  readonly error: string | null;
}

function createTestWaveform(): Float32Array {
  const sampleRate = 16_000;
  const durationSeconds = 1;
  const frequency = 220;
  const amplitude = 0.2;

  const waveform = new Float32Array(
    sampleRate * durationSeconds,
  );

  for (let index = 0; index < waveform.length; index += 1) {
    waveform[index] =
      amplitude *
      Math.sin(
        (2 * Math.PI * frequency * index) / sampleRate,
      );
  }

  return waveform;
}

export async function runCharsiuModelDiagnostics(): Promise<CharsiuModelDiagnostics> {
  try {
    const model = await getCharsiuModel();

    const silenceTokenId = model.phoneVocabulary["[SIL]"];
    const unknownTokenId = model.phoneVocabulary["[UNK]"];

    const waveform = createTestWaveform();

    const input = new ort.Tensor(
      "float32",
      waveform,
      [1, waveform.length],
    );

    const output = await model.session.run({
      input_values: input,
    });

    const logits = output.logits;

    if (logits === undefined) {
      throw new Error("The model did not return a logits tensor.");
    }

    let hasFiniteValues = true;

for (let index = 0; index < logits.data.length; index += 1) {
  const value = logits.data[index];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    hasFiniteValues = false;
    break;
  }
}

    return {
      success:
        logits.dims.length === 3 &&
        logits.dims[0] === 1 &&
        logits.dims[1] !== undefined &&
        logits.dims[1] > 0 &&
        logits.dims[2] !== undefined &&
        logits.dims[2] > 0 &&
        hasFiniteValues &&
        silenceTokenId !== undefined,
      model: {
        inputNames: model.session.inputNames,
        outputNames: model.session.outputNames,
        phoneCount: Object.keys(model.phoneVocabulary).length,
        silenceTokenId: silenceTokenId ?? null,
        unknownTokenId: unknownTokenId ?? null,
      },
      inference: {
        outputDimensions: logits.dims,
        outputValueCount: logits.data.length,
        hasFiniteValues,
      },
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      model: {
        inputNames: [],
        outputNames: [],
        phoneCount: 0,
        silenceTokenId: null,
        unknownTokenId: null,
      },
      inference: null,
      error:
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : "Unknown Charsiu model diagnostic error.",
    };
  }
}
