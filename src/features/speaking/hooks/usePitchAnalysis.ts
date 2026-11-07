import { useCallback, useRef, useState } from "react";
import { detectPitch } from "../utils/pitchDetection";
import type { PitchFrame } from "../utils/pitchDetection";
import { normalizePitchContour } from "../utils/pitchNormalization";
import type { PitchNormalizationResult } from "../utils/pitchNormalization";
import { assessTone } from "../utils/toneAssessment";
import type { ToneAssessmentResult } from "../utils/toneAssessment";

interface UsePitchAnalysisReturn {
  frames: PitchFrame[];
  duration: number;
  normalization: PitchNormalizationResult | null;
  assessment: ToneAssessmentResult | null;
  isAnalyzing: boolean;
  error: string | null;
  analyze: (audioUrl: string) => Promise<void>;
  reset: () => void;
}

export function usePitchAnalysis(): UsePitchAnalysisReturn {
  const [frames, setFrames] = useState<PitchFrame[]>([]);
  const [duration, setDuration] = useState(0);
  const [normalization, setNormalization] =
    useState<PitchNormalizationResult | null>(null);
  const [assessment, setAssessment] = useState<ToneAssessmentResult | null>(
    null,
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    setFrames([]);
    setDuration(0);
    setNormalization(null);
    setAssessment(null);
    setIsAnalyzing(false);
    setError(null);
  }, []);

  const analyze = useCallback(async (audioUrl: string) => {
    const requestId = ++requestIdRef.current;
    let audioContext: AudioContext | null = null;

    setIsAnalyzing(true);
    setError(null);
    setFrames([]);
    setDuration(0);
    setNormalization(null);
    setAssessment(null);

    try {
      if (typeof AudioContext === "undefined") {
        throw new Error("Audio analysis is not supported in this browser.");
      }

      const response = await fetch(audioUrl);

      if (!response.ok) {
        throw new Error("Could not read the recording.");
      }

      const audioData = await response.arrayBuffer();

      audioContext = new AudioContext();

      const audioBuffer = await audioContext.decodeAudioData(audioData);
      const channelData = audioBuffer.getChannelData(0);

      const pitchFrames = detectPitch(channelData, audioBuffer.sampleRate);

      if (requestId !== requestIdRef.current) {
        return;
      }

      if (pitchFrames.length === 0) {
        throw new Error("The recording is too short to analyze.");
      }

      const normalizedContour = normalizePitchContour(pitchFrames);
      const toneResult = assessTone(normalizedContour);

      setFrames(pitchFrames);
      setDuration(audioBuffer.duration);
      setNormalization(normalizedContour);
      setAssessment(toneResult);
    } catch (caughtError) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "An unexpected error occurred during audio analysis.",
      );
    } finally {
      if (audioContext && audioContext.state !== "closed") {
        await audioContext.close();
      }

      if (requestId === requestIdRef.current) {
        setIsAnalyzing(false);
      }
    }
  }, []);

  return {
    frames,
    duration,
    normalization,
    assessment,
    isAnalyzing,
    error,
    analyze,
    reset,
  };
}
