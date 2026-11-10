import * as ort from "onnxruntime-web";
import { loadPhoneVocabZh } from "charsiu-js/assets-web";

export interface CharsiuModel {
  readonly session: ort.InferenceSession;
  readonly phoneVocabulary: Readonly<Record<string, number>>;
}

const MODEL_URL =
  "https://huggingface.co/mnaoizyyy/charsiu-js-models/resolve/main/zh_w2v2_tiny_fc_10ms/model_quantized.onnx";

const VOCABULARY_BASE_URL = "/models/charsiu/";

let modelPromise: Promise<CharsiuModel> | null = null;

async function initializeModel(): Promise<CharsiuModel> {
  const [session, phoneVocabulary] = await Promise.all([
    ort.InferenceSession.create(MODEL_URL, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    }),
    loadPhoneVocabZh(VOCABULARY_BASE_URL),
  ]);

  return {
    session,
    phoneVocabulary,
  };
}

export function getCharsiuModel(): Promise<CharsiuModel> {
  if (modelPromise === null) {
    modelPromise = initializeModel().catch((error: unknown) => {
      modelPromise = null;
      throw error;
    });
  }

  return modelPromise;
}
