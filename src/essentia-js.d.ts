declare module "essentia.js/dist/essentia.js-core.es.js" {
  interface EssentiaVector {
    delete(): void;
  }
  interface EssentiaPyinResult {
    pitch: EssentiaVector;
    voicedProbabilities: EssentiaVector;
  }
  export default class Essentia {
    constructor(module: unknown);
    arrayToVector(values: Float32Array): EssentiaVector;
    vectorToArray(vector: EssentiaVector): Float32Array;
    PitchYinProbabilistic(
      signal: EssentiaVector,
      frameSize: number,
      hopSize: number,
      lowRMSThreshold: number,
      outputUnvoiced: string,
      preciseTime: boolean,
      sampleRate: number,
    ): EssentiaPyinResult;
  }
}

declare module "essentia.js/dist/essentia-wasm.es.js" {
  export const EssentiaWASM: unknown;
}
