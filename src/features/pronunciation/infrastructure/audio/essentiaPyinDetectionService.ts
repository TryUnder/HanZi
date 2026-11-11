import type { PitchFrame } from "../../domain/models/pitchFrame";

/**
 * Experimental alternative to the existing YIN detector.
 * Essentia.js pYIN runs in a dedicated worker to avoid blocking the UI.
 * No scoring thresholds are adjusted here to force a better result.
 */
export function detectPitchEssentiaPyin(
  waveform: Float32Array,
  sampleRate: number,
): Promise<PitchFrame[]> {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) {
    return Promise.reject(new Error("Invalid audio sample rate."));
  }
  if (waveform.some((sample) => !Number.isFinite(sample))) {
    return Promise.reject(new Error("Audio contains non-finite samples."));
  }
  if (waveform.length < 2048) {
    return Promise.resolve([]);
  }

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./essentiaPyin.worker.ts", import.meta.url),
      { type: "module" },
    );
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Essentia pYIN exceeded the 30-second limit."));
    }, 30_000);
    const cleanup = () => {
      clearTimeout(timeout);
      worker.terminate();
    };

    worker.onmessage = (
      event: MessageEvent<{
        readonly success: boolean;
        readonly error?: string;
        readonly result?: {
          readonly frequencies: readonly number[];
          readonly voicedProbabilities: readonly number[];
        };
      }>,
    ) => {
      const data = event.data;
      cleanup();
      if (!data.success || !data.result) {
        reject(new Error(data.error ?? "Essentia pYIN failed."));
        return;
      }

      const { frequencies, voicedProbabilities } = data.result;
      resolve(
        frequencies.map((frequency, index) => {
          const probability = voicedProbabilities[index] ?? 0;
          const isVoiced =
            Number.isFinite(frequency) &&
            frequency >= 65 &&
            frequency <= 500 &&
            Number.isFinite(probability) &&
            probability >= 0.5;

          return {
            // Essentia frame cutter: frame timestamps at window centers.
            timeSeconds: (index * 160 + 1024) / sampleRate,
            frequencyHz: isVoiced ? frequency : null,
            clarity: isVoiced ? Math.min(1, Math.max(0, probability)) : 0,
          };
        }),
      );
    };
    worker.onerror = (error) => {
      cleanup();
      reject(new Error(error.message || "Essentia pYIN worker error."));
    };
    const samples = waveform.slice();
    worker.postMessage({ samples, sampleRate }, [samples.buffer]);
  });
}
