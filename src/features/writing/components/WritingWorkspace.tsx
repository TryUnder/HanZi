import { useCallback, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { ChineseCharacter } from "../../library/types/character";
import { CharacterCanvas } from "./CharacterCanvas";
import { PracticeCanvas } from "./PracticeCanvas";
import { useWritingSession } from "../hooks/useWritingSession";
import styles from "../pages/WritingPage.module.css";
import type { WritingHistoryEntry } from "../types/writingHistory";
import type { WritingMode, WritingSessionResult } from "../types/writing";

interface WritingWorkspaceProps {
  character: ChineseCharacter;
  historyError: string | null;
  addSession: (
    result: WritingSessionResult,
  ) => Promise<WritingHistoryEntry | null>;
}

export function WritingWorkspace({
  character,
  historyError,
  addSession,
}: WritingWorkspaceProps) {
  const [mode, setMode] = useState<WritingMode>("learn");
  const [attempt, setAttempt] = useState(0);
  const savedSessionKeyRef = useRef<string | null>(null);

  const {
    progress,
    resetProgress,
    handleCorrectStroke,
    handleMistake,
    handleComplete,
    getStrokeMistakes,
  } = useWritingSession(character.strokes);

  const sessionKey = `${character.id}:${attempt}`;

  const handleSessionComplete = useCallback(
    (totalMistakes: number) => {
      if (savedSessionKeyRef.current === sessionKey) {
        return;
      }

      // Lock this attempt before starting the asynchronous save.
      savedSessionKeyRef.current = sessionKey;

      handleComplete(totalMistakes);

      const result: WritingSessionResult = {
        characterId: character.id,
        character: character.simplified,
        correctStrokes: character.strokes,
        totalStrokes: character.strokes,
        mistakes: totalMistakes,
        strokeMistakes: getStrokeMistakes(),
        completedAt: new Date().toISOString(),
      };

      void addSession(result);
    },
    [addSession, character, getStrokeMistakes, handleComplete, sessionKey],
  );

  function handleModeChange(nextMode: WritingMode) {
    if (nextMode === "practice" && mode !== "practice") {
      resetProgress();
      setAttempt((current) => current + 1);
    }

    setMode(nextMode);
  }

  function handleRetry() {
    resetProgress();
    setAttempt((current) => current + 1);
  }

  const progressPercentage =
    progress.totalStrokes > 0
      ? (progress.correctStrokes / progress.totalStrokes) * 100
      : 0;

  return (
    <>
      <div className={styles.modeControls}>
        <button
          className={mode === "learn" ? styles.activeMode : styles.modeButton}
          onClick={() => handleModeChange("learn")}
          type="button"
        >
          Learn
        </button>

        <button
          className={
            mode === "practice" ? styles.activeMode : styles.modeButton
          }
          onClick={() => handleModeChange("practice")}
          type="button"
        >
          Practice
        </button>
      </div>

      <div className={styles.practiceArea}>
        {mode === "learn" ? (
          <CharacterCanvas character={character.simplified} />
        ) : (
          <>
            <PracticeCanvas
              key={`${character.id}-${attempt}`}
              character={character.simplified}
              onCorrectStroke={handleCorrectStroke}
              onMistake={handleMistake}
              onComplete={handleSessionComplete}
            />

            <section className={styles.sessionPanel}>
              <div className={styles.progressHeader}>
                <strong>Writing progress</strong>
                <span>
                  {progress.correctStrokes} / {progress.totalStrokes} strokes
                </span>
              </div>

              <div
                className={styles.progressTrack}
                role="progressbar"
                aria-label="Writing progress"
                aria-valuemin={0}
                aria-valuemax={progress.totalStrokes}
                aria-valuenow={progress.correctStrokes}
              >
                <div
                  className={styles.progressFill}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>

              <div className={styles.progressStats}>
                <span>
                  <strong>{progress.mistakes}</strong> mistakes
                </span>

                <span>
                  <strong>
                    {progress.totalStrokes - progress.correctStrokes}
                  </strong>{" "}
                  remaining
                </span>
              </div>

              {historyError && (
                <p role="alert">Could not save your session: {historyError}</p>
              )}

              {progress.completed && (
                <div className={styles.completionMessage}>
                  <strong>Well done!</strong>
                  <span>
                    You completed {character.simplified} with{" "}
                    {progress.mistakes} mistakes.
                  </span>
                </div>
              )}

              <button
                className={styles.retryButton}
                onClick={handleRetry}
                type="button"
              >
                <RotateCcw size={15} />
                Try again
              </button>
            </section>
          </>
        )}
      </div>
    </>
  );
}
