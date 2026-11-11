/**
 * Diagnostic ONLY. Not a unit test or a calibration.
 * Run with: node scripts/diagnose-essentia-pyin.cjs
 * Essentia.js pYIN reports inaccurate F0 for 16kHz reference sine waves.
 */
const { Essentia, EssentiaWASM } = require("essentia.js");

const e = new Essentia(EssentiaWASM);
const sampleRate = 16000;
const length = sampleRate;
const expected = [100, 150, 200, 300];

function median(values) {
  const sorted = [...values].filter((v) => v > 0 && Number.isFinite(v)).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : null;
}

for (const hz of expected) {
  const samples = Float32Array.from({ length }, (_, i) => (
    0.35 * Math.sin((2 * Math.PI * hz * i) / sampleRate)
  ));
  const signal = e.arrayToVector(samples);
  const estimate = e.PitchYinProbabilistic(
    signal, 2048, 160, 0.004, "zero", false, sampleRate,
  );
  const values = e.vectorToArray(estimate.pitch);
  const voiced = e.vectorToArray(estimate.voicedProbabilities);
  const result = {
    expectedHz: hz,
    medianReportedHz: median(values),
    medianVoicedProbability: median(voiced),
  };
  console.log(JSON.stringify(result));
  estimate.pitch.delete();
  estimate.voicedProbabilities.delete();
  signal.delete();
}
