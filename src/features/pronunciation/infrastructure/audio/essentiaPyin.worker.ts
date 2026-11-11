import Essentia from "essentia.js/dist/essentia.js-core.es.js";
import { EssentiaWASM } from "essentia.js/dist/essentia-wasm.es.js";

interface Request {
  readonly samples: Float32Array;
  readonly sampleRate: number;
}

interface Result {
  readonly frequencies: number[];
  readonly voicedProbabilities: number[];
}

self.onmessage = (event: MessageEvent<Request>) => {
  try {
    const { samples, sampleRate } = event.data;
    const essentia = new Essentia(EssentiaWASM);
    const input = essentia.arrayToVector(samples);
    try {
      // pYIN includes its own probabilistic candidate generation and HMM.
      // Do NOT run the legacy Viterbi path on top of this output.
      const output = essentia.PitchYinProbabilistic(
        input, 2048, 160, 0.004, "zero", false, sampleRate,
      );
      try {
        const result: Result = {
          frequencies: Array.from(essentia.vectorToArray(output.pitch)),
          voicedProbabilities: Array.from(
            essentia.vectorToArray(output.voicedProbabilities),
          ),
        };
        self.postMessage({ success: true, result });
      } finally {
        output.pitch.delete();
        output.voicedProbabilities.delete();
      }
    } finally {
      input.delete();
    }
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
