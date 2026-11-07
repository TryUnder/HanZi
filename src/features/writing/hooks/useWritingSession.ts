import { useCallback, useRef, useState } from "react";
import type {
  StrokeMistake,
  WritingMistakeEvent,
  WritingProgress,
  WritingSessionResult,
} from "../types/writing";

function createInitialProgress(totalStrokes: number): WritingProgress {
  return {
    correctStrokes: 0,
    totalStrokes,
    mistakes: 0,
    strokeMistakes: [],
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

  const strokeMistakesRef = useRef<StrokeMistake[]>([]);

  const resetProgress = useCallback(() => {
    strokeMistakesRef.current = [];
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

  const handleMistake = useCallback(
    (event: WritingMistakeEvent) => {
      if (
        !Number.isInteger(event.strokeNum) ||
        event.strokeNum < 0 ||
        event.strokeNum >= totalStrokes ||
        !Number.isInteger(event.mistakesOnStroke) ||
        event.mistakesOnStroke < 1 ||
        !Number.isInteger(event.totalMistakes) ||
        event.totalMistakes < 1
      ) {
        return;
      }

      const updatedMistakes = [...strokeMistakesRef.current];
      const existingIndex = updatedMistakes.findIndex(
        (item) => item.strokeIndex === event.strokeNum,
      );

      const strokeMistake: StrokeMistake = {
        strokeIndex: event.strokeNum,
        mistakes: event.mistakesOnStroke,
      };

      if (existingIndex >= 0) {
        updatedMistakes[existingIndex] = strokeMistake;
      } else {
        updatedMistakes.push(strokeMistake);
      }

      updatedMistakes.sort(
        (first, second) => first.strokeIndex - second.strokeIndex,
      );

      strokeMistakesRef.current = updatedMistakes;

      setProgress((current) => ({
        ...current,
        mistakes: event.totalMistakes,
        strokeMistakes: updatedMistakes,
      }));
    },
    [totalStrokes],
  );

  const handleComplete = useCallback((totalMistakes: number) => {
    setProgress((current) => ({
      ...current,
      correctStrokes: current.totalStrokes,
      mistakes: totalMistakes,
      completed: true,
      strokeMistakes: strokeMistakesRef.current,
    }));
  }, []);

  const getStrokeMistakes = useCallback(() => {
    return strokeMistakesRef.current.map((item) => ({ ...item }));
  }, []);

  const createResult = useCallback((): WritingSessionResult => {
    return {
      characterId,
      character,
      correctStrokes: progress.correctStrokes,
      totalStrokes: progress.totalStrokes,
      mistakes: progress.mistakes,
      strokeMistakes: getStrokeMistakes(),
      completedAt: new Date().toISOString(),
    };
  }, [characterId, character, getStrokeMistakes, progress]);

  return {
    progress,
    resetProgress,
    handleCorrectStroke,
    handleMistake,
    handleComplete,
    createResult,
    getStrokeMistakes,
  };
}
