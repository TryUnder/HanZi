import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleX,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { learningRecordService } from "../../../../app/services/learningRecordService";
import type { ResolvedLessonItem } from "../../application/services/lessonContentService";
import { generateVocabularyExercise } from "../../application/services/vocabularyExerciseService";
import styles from "./VocabularyExercise.module.css";

interface VocabularyExerciseProps {
  readonly items: readonly ResolvedLessonItem[];
}

interface AnswerResult {
  readonly questionId: string;
  readonly selectedChoiceId: string;
  readonly isCorrect: boolean;
}

type ExercisePhase = "ready" | "active" | "completed";

export function VocabularyExercise({ items }: VocabularyExerciseProps) {
  const [phase, setPhase] = useState<ExercisePhase>("ready");
  const [runId, setRunId] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerResult[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState(0);

  const questionStartedAt = useRef(0);

  const questions = useMemo(
    () => generateVocabularyExercise(items),
    // runId intentionally regenerates questions when the user restarts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, runId],
  );

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentIndex];

  const correctAnswers = answers.filter((answer) => answer.isCorrect).length;

  useEffect(() => {
    if (phase === "active") {
      questionStartedAt.current = performance.now();
    }
  }, [currentIndex, phase, runId]);

  function startExercise() {
    setCurrentIndex(0);
    setAnswers([]);
    setSaveErrors(0);
    setPhase("active");
  }

  async function selectAnswer(choiceId: string, answeredAt: number) {
    if (!currentQuestion || currentAnswer || isSaving) {
      return;
    }

    const isCorrect = choiceId === currentQuestion.correctChoiceId;

    const responseTimeMs = Math.max(
      0,
      Math.round(answeredAt - questionStartedAt.current),
    );

    const answer: AnswerResult = {
      questionId: currentQuestion.id,
      selectedChoiceId: choiceId,
      isCorrect,
    };

    setAnswers((previous) => [...previous, answer]);
    setIsSaving(true);

    try {
      await learningRecordService.recordAttempt({
        recordType: "attempt",
        activity: "recognition",
        item: currentQuestion.item,
        details: {
          isCorrect,
          responseTimeMs,
        },
      });
    } catch {
      setSaveErrors((previous) => previous + 1);
    } finally {
      setIsSaving(false);
    }
  }

  function goToNextQuestion() {
    if (!currentQuestion || !currentAnswer || isSaving) {
      return;
    }

    if (currentIndex >= questions.length - 1) {
      setPhase("completed");
      return;
    }

    setCurrentIndex((previous) => previous + 1);
  }

  function restartExercise() {
    setRunId((previous) => previous + 1);
    setCurrentIndex(0);
    setAnswers([]);
    setSaveErrors(0);
    setPhase("active");
  }

  if (questions.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.emptyState}>
          <CircleX size={24} />
          <h2>Vocabulary exercise unavailable</h2>
          <p>
            There are not enough vocabulary entries with distinct meanings to
            create this exercise.
          </p>
        </div>
      </section>
    );
  }

  if (phase === "ready") {
    return (
      <section className={styles.section}>
        <div className={styles.intro}>
          <div className={styles.introIcon}>
            <Trophy size={23} />
          </div>

          <div className={styles.introContent}>
            <span className={styles.eyebrow}>PRACTICE</span>
            <h2>Vocabulary recognition</h2>
            <p>
              Choose the correct Polish meaning for each Chinese word.
              You will answer {questions.length} questions.
            </p>
          </div>

          <button className={styles.primaryButton} onClick={startExercise}>
            Start exercise
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    );
  }

  if (phase === "completed") {
    return (
      <section className={styles.section}>
        <div className={styles.results}>
          <div className={styles.resultsIcon}>
            <Trophy size={28} />
          </div>

          <span className={styles.eyebrow}>EXERCISE COMPLETED</span>
          <h2>Your result</h2>

          <div className={styles.score}>
            <strong>{correctAnswers}</strong>
            <span>/ {questions.length}</span>
          </div>

          <p>
            {correctAnswers === questions.length
              ? "Perfect! You answered every question correctly."
              : "Good work! Keep practising to improve your vocabulary."}
          </p>

          {answers.some((answer) => !answer.isCorrect) && (
            <div className={styles.mistakes}>
              <h3>Words to practise</h3>

              {answers
                .filter((answer) => !answer.isCorrect)
                .map((answer) => {
                  const question = questions.find(
                    (item) => item.id === answer.questionId,
                  );

                  const correctChoice = question?.choices.find(
                    (choice) => choice.id === question.correctChoiceId,
                  );

                  return (
                    <div className={styles.mistake} key={answer.questionId}>
                      <strong>{question?.character}</strong>
                      <span>{question?.pinyin}</span>
                      <span>{correctChoice?.text}</span>
                    </div>
                  );
                })}
            </div>
          )}

          {saveErrors > 0 && (
            <p className={styles.saveWarning} role="status">
              {saveErrors} {saveErrors === 1 ? "answer was" : "answers were"}{" "}
              not saved to your learning history.
            </p>
          )}

          <button className={styles.primaryButton} onClick={restartExercise}>
            <RotateCcw size={16} />
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.exercise}>
        <div className={styles.exerciseHeader}>
          <div>
            <span className={styles.eyebrow}>VOCABULARY PRACTICE</span>
            <h2>Choose the correct meaning</h2>
          </div>

          <span className={styles.progressLabel}>
            {currentIndex + 1} / {questions.length}
          </span>
        </div>

        <div className={styles.progressTrack}>
          <div
            className={styles.progressValue}
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>

        <div className={styles.question}>
          <span className={styles.questionLabel}>WHAT DOES THIS MEAN?</span>
          <strong className={styles.character}>
            {currentQuestion.character}
          </strong>
          <span className={styles.pinyin}>
            {currentQuestion.pinyin || "Pinyin unavailable"}
          </span>
        </div>

        <div className={styles.choices}>
          {currentQuestion.choices.map((choice, index) => {
            const isSelected =
              currentAnswer?.selectedChoiceId === choice.id;
            const isCorrect = choice.id === currentQuestion.correctChoiceId;

            const isIncorrectSelection =
              Boolean(currentAnswer) &&
              isSelected &&
              !currentAnswer?.isCorrect;

            let choiceClass = styles.choice;

            if (currentAnswer && isCorrect) {
              choiceClass = `${styles.choice} ${styles.correctChoice}`;
            } else if (isIncorrectSelection) {
              choiceClass = `${styles.choice} ${styles.incorrectChoice}`;
            }

            return (
              <button
                className={choiceClass}
                key={choice.id}
                disabled={Boolean(currentAnswer) || isSaving}
                onClick={(event) =>
                  void selectAnswer(choice.id, event.timeStamp)
                }
              >
                <span className={styles.choiceLetter}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{choice.text}</span>

                {currentAnswer && isCorrect && (
                  <CheckCircle2 size={18} />
                )}

                {isIncorrectSelection && <CircleX size={18} />}
              </button>
            );
          })}
        </div>

        {currentAnswer && (
          <div
            className={
              currentAnswer.isCorrect
                ? styles.feedbackCorrect
                : styles.feedbackIncorrect
            }
            role="status"
          >
            <strong>
              {currentAnswer.isCorrect ? "Correct!" : "Not quite!"}
            </strong>
            <span>
              {currentAnswer.isCorrect
                ? "Well done."
                : `The correct answer is ${
                    currentQuestion.choices.find(
                      (choice) =>
                        choice.id === currentQuestion.correctChoiceId,
                    )?.text ?? ""
                  }.`}
            </span>
          </div>
        )}

        {saveErrors > 0 && (
          <p className={styles.saveWarning} role="status">
            Some answers could not be saved to your learning history.
          </p>
        )}

        {currentAnswer && (
          <button
            className={styles.primaryButton}
            disabled={isSaving}
            onClick={goToNextQuestion}
          >
            {isSaving
              ? "Saving..."
              : currentIndex === questions.length - 1
                ? "See results"
                : "Next question"}
            {!isSaving && <ArrowRight size={16} />}
          </button>
        )}
      </div>
    </section>
  );
}
