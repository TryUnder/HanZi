import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { characters } from "../../library/data/characters";
import { CharacterCanvas } from "../components/CharacterCanvas";
import { PracticeCanvas } from "../components/PracticeCanvas";
import { useWritingSession } from "../hooks/useWritingSession";
import type { WritingMode } from "../types/writing";
import styles from "./WritingPage.module.css";

export function WritingPage() {
  const [selectedCharacterId, setSelectedCharacterId] = useState("ni");
  const [mode, setMode] = useState<WritingMode>("learn");
  const [attempt, setAttempt] = useState(0);

  const selectedCharacter =
    characters.find((character) => character.id === selectedCharacterId) ??
    characters[0];

  if (!selectedCharacter) {
    throw new Error("The character library is empty.");
  }

  const {
    progress,
    resetProgress,
    handleCorrectStroke,
    handleMistake,
    handleComplete,
  } = useWritingSession(
    selectedCharacter.id,
    selectedCharacter.simplified,
    selectedCharacter.strokes,
  );

  function handleCharacterChange(characterId: string) {
    setSelectedCharacterId(characterId);
    setMode("learn");
    resetProgress();
    setAttempt(0);
  }

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
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>LEARN CHINESE WRITING</span>
        <h1>Character practice</h1>
        <p>Learn how Chinese characters are written, stroke by stroke.</p>
      </header>

      <section className={styles.workspace}>
        <div className={styles.characterSelector}>
          <label htmlFor="character-select">Choose a character</label>

          <select
            id="character-select"
            value={selectedCharacterId}
            onChange={(event) => handleCharacterChange(event.target.value)}
          >
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.simplified} — {character.pinyin} ({character.meaning}
                )
              </option>
            ))}
          </select>

          <div className={styles.characterInfo}>
            <span>{selectedCharacter.simplified}</span>
            <strong>{selectedCharacter.pinyin}</strong>
            <p>{selectedCharacter.meaning}</p>
            <small>
              {selectedCharacter.strokes} strokes · HSK{" "}
              {selectedCharacter.hskLevel}
            </small>
          </div>

          <div className={styles.modeControls}>
            <button
              className={
                mode === "learn" ? styles.activeMode : styles.modeButton
              }
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
        </div>

        <div className={styles.practiceArea}>
          {mode === "learn" ? (
            <CharacterCanvas
              key={selectedCharacter.id}
              character={selectedCharacter.simplified}
            />
          ) : (
            <>
              <PracticeCanvas
                key={`${selectedCharacter.id}-${attempt}`}
                character={selectedCharacter.simplified}
                onCorrectStroke={handleCorrectStroke}
                onMistake={handleMistake}
                onComplete={handleComplete}
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

                {progress.completed && (
                  <div className={styles.completionMessage}>
                    <strong>Well done!</strong>
                    <span>
                      You completed {selectedCharacter.simplified} with{" "}
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
      </section>
    </div>
  );
}
