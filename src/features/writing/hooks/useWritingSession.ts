import { useCallback, useState } from "react";
import type { WritingProgress, WritingSessionResult } from "../types/writing";

function createInitialProgress(totalStrokes: number): WritingProgress {
  return {
    correctStrokes: 0,
    totalStrokes,
    mistakes: 0,
    completed: false,
  };
}

export function useWritingSession(
  characterId: string,
  character: string,
  totalStrokes: number,
) {
  const [progress, setProgress] = useState<WritingProgress>(() =>
    createInitialProgress(totalStrokes),
  );

  const resetProgress = useCallback(() => {
    setProgress(createInitialProgress(totalStrokes));
  }, [totalStrokes]);

  const handleCorrectStroke = useCallback(() => {
    setProgress((current) => ({
      ...current,
      correctStrokes: Math.min(
        current.correctStrokes + 1,
        current.totalStrokes,
      ),
    }));
  }, []);

  const handleMistake = useCallback((totalMistakes: number) => {
    setProgress((current) => ({
      ...current,
      mistakes: totalMistakes,
    }));
  }, []);

  const handleComplete = useCallback((totalMistakes: number) => {
    setProgress((current) => ({
      ...current,
      correctStrokes: current.totalStrokes,
      mistakes: totalMistakes,
      completed: true,
    }));
  }, []);

  const createResult = useCallback((): WritingSessionResult => {
    return {
      characterId,
      character,
      correctStrokes: progress.correctStrokes,
      totalStrokes: progress.totalStrokes,
      mistakes: progress.mistakes,
      completedAt: new Date().toISOString(),
    };
  }, [characterId, character, progress]);

  return {
    progress,
    resetProgress,
    handleCorrectStroke,
    handleMistake,
    handleComplete,
    createResult,
  };
}
