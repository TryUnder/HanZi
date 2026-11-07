import { Headphones, Languages, Volume2 } from "lucide-react";
import { useListeningExercise } from "../hooks/useListeningExercise";
import type { ListeningExerciseMode } from "../types/speaking";
import { PronunciationPlayer } from "./PronunciationPlayer";
import { ToneContourChart } from "./ToneContourChart";
import { toneDefinitions } from "../data/toneDefinitions";
import styles from "./ListeningExercise.module.css";

const EXERCISE_MODES: {
  id: ListeningExerciseMode;
  title: string;
  description: string;
}[] = [
  {
    id: "character",
    title: "Character recognition",
    description: "Listen and identify the Chinese character.",
  },
  {
    id: "pinyin",
    title: "Pinyin recognition",
    description: "Listen and identify the correct pronunciation.",
  },
  {
    id: "tone",
    title: "Tone recognition",
    description: "Listen and identify the Mandarin tone.",
  },
];

export function ListeningExercise() {
  const {
    phase,
    mode,
    questions,
    currentQuestion,
    questionIndex,
    score,
    selectedAnswer,
    isCorrect,
    progress,
    start,
    answer,
    next,
    reset,
  } = useListeningExercise();

  const correctDefinition =
    mode === "tone" && currentQuestion
      ? toneDefinitions.find(
          (definition) => definition.tone === currentQuestion.character.tone,
        )
      : undefined;

  const isCharacterMode = mode === "character";
  const isPinyinMode = mode === "pinyin";

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>LISTENING PRACTICE</span>
          <h2 className={styles.title}>Train your listening skills</h2>
          <p className={styles.description}>
            Improve your Mandarin listening and pronunciation recognition.
          </p>
        </div>
      </header>

      {phase === "intro" && (
        <div className={styles.intro}>
          <div className={styles.introIcon} aria-hidden="true">
            <Headphones size={28} />
          </div>

          <h3>Choose your exercise</h3>

          <p>Select what you want to practice today.</p>

          <div className={styles.modeList}>
            {EXERCISE_MODES.map((exerciseMode) => (
              <button
                key={exerciseMode.id}
                type="button"
                className={styles.modeButton}
                onClick={() => start(exerciseMode.id)}
              >
                <span className={styles.modeIcon}>
                  {exerciseMode.id === "character" ? (
                    <Languages size={20} />
                  ) : exerciseMode.id === "pinyin" ? (
                    <Volume2 size={20} />
                  ) : (
                    <Headphones size={20} />
                  )}
                </span>

                <span className={styles.modeText}>
                  <strong>{exerciseMode.title}</strong>
                  <span>{exerciseMode.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(phase === "question" || phase === "feedback") && currentQuestion && (
        <div className={styles.exercise}>
          <div className={styles.progressHeader}>
            <span>
              QUESTION {questionIndex + 1} OF {questions.length}
            </span>

            <span>
              Score: {score}/{questions.length}
            </span>
          </div>

          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuenow={questionIndex + 1}
            aria-valuemin={1}
            aria-valuemax={questions.length}
            aria-label="Exercise progress"
          >
            <div
              className={styles.progressFill}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className={styles.prompt}>
            <h3>
              {isCharacterMode
                ? "Which character did you hear?"
                : isPinyinMode
                  ? "Which pronunciation did you hear?"
                  : "Which tone did you hear?"}
            </h3>

            <p>Listen carefully and select the correct answer.</p>

            <PronunciationPlayer
              key={currentQuestion.id}
              audioUrl={currentQuestion.character.audioUrl ?? null}
              text={currentQuestion.character.simplified}
              label="audio prompt"
            />

            <span className={styles.replayHint}>
              You can listen more than once.
            </span>
          </div>

          <div className={styles.answers}>
            {currentQuestion.options.map((option) => {
              const isSelected = selectedAnswer === option;
              const isCorrectAnswer =
                phase === "feedback" &&
                option === currentQuestion.correctAnswer;

              let answerClass = styles.answerButton;

              if (isCorrectAnswer) {
                answerClass += ` ${styles.answerCorrect}`;
              } else if (phase === "feedback" && isSelected && !isCorrect) {
                answerClass += ` ${styles.answerIncorrect}`;
              }

              return (
                <button
                  key={option}
                  type="button"
                  className={answerClass}
                  disabled={phase === "feedback"}
                  aria-pressed={isSelected}
                  onClick={() => answer(option)}
                >
                  {isCharacterMode ? (
                    <span className={styles.answerCharacter}>{option}</span>
                  ) : (
                    <span className={styles.answerName}>
                      {isPinyinMode ? option : `Tone ${option}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {phase === "feedback" && (
            <div
              className={`${styles.feedback} ${
                isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect
              }`}
              aria-live="polite"
            >
              <h3>{isCorrect ? "Correct!" : "Not quite. Keep practicing!"}</h3>

              <p>
                The correct answer is{" "}
                <strong>
                  {isCharacterMode
                    ? currentQuestion.character.simplified
                    : isPinyinMode
                      ? currentQuestion.character.pinyin
                      : `Tone ${currentQuestion.correctAnswer}`}
                </strong>
                .
              </p>

              <div className={styles.answerDetails}>
                <span className={styles.answerCharacter}>
                  {currentQuestion.character.simplified}
                </span>

                <div className={styles.answerInfo}>
                  <strong>{currentQuestion.character.pinyin}</strong>
                  <span>{currentQuestion.character.meaning}</span>
                </div>
              </div>

              {correctDefinition && (
                <>
                  <div className={styles.feedbackChart}>
                    <ToneContourChart definition={correctDefinition} />
                  </div>

                  <p className={styles.toneDescription}>
                    {correctDefinition.description}
                  </p>
                </>
              )}

              <button
                type="button"
                className={styles.primaryButton}
                onClick={next}
              >
                {questionIndex + 1 === questions.length
                  ? "See results"
                  : "Next question"}
              </button>
            </div>
          )}
        </div>
      )}

      {phase === "complete" && (
        <div className={styles.complete}>
          <span className={styles.eyebrow}>EXERCISE COMPLETED</span>

          <h3>Great work!</h3>

          <div className={styles.finalScore}>
            <strong>
              {score}/{questions.length}
            </strong>
            <span>Correct answers</span>
          </div>

          <p>
            You achieved{" "}
            <strong>{Math.round((score / questions.length) * 100)}%</strong>{" "}
            accuracy.
          </p>

          <button
            type="button"
            className={styles.primaryButton}
            onClick={reset}
          >
            Choose another exercise
          </button>
        </div>
      )}
    </section>
  );
}
