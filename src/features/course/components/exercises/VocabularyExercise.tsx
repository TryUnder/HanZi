import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleX,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { learningRecordService } from "../../../../app/services/learningRecordService";
import type { LearningRecord } from "../../../learning/domain/types";
import type { ResolvedLessonItem } from "../../application/services/lessonContentService";
import { generateVocabularyExercise } from "../../application/services/vocabularyExerciseService";
import styles from "./VocabularyExercise.module.css";

interface VocabularyExerciseProps {
  readonly items: readonly ResolvedLessonItem[];
  readonly courseId: string;
  readonly lessonId: string;
  readonly activityId: string;
}

interface AnswerResult {
  readonly questionId: string;
  readonly selectedChoiceId: string;
  readonly isCorrect: boolean;
}

type ExercisePhase = "ready" | "active" | "completed";

type VocabularyItem = Extract<ResolvedLessonItem, { kind: "vocabulary" }>;

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;

    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function getMasteredWordIds(
  records: readonly LearningRecord[],
  courseId: string,
  lessonId: string,
  activityId: string,
): Set<string> {
  const masteredIds = new Set<string>();

  for (const record of records) {
    if (
      record.recordType !== "attempt" ||
      record.activity !== "recognition" ||
      record.item.kind !== "vocabulary" ||
      record.context?.courseId !== courseId ||
      record.context?.lessonId !== lessonId ||
      record.context?.activityId !== activityId
    ) {
      continue;
    }

    if (record.details.isCorrect) {
      masteredIds.add(record.item.id);
    }
  }

  return masteredIds;
}

export function VocabularyExercise({
  items,
  courseId,
  lessonId,
  activityId,
}: VocabularyExerciseProps) {
  const vocabularyItems = useMemo(
    () =>
      items.filter(
        (item): item is VocabularyItem => item.kind === "vocabulary",
      ),
    [items],
  );

  const [phase, setPhase] = useState<ExercisePhase>("ready");
  const [roundItems, setRoundItems] = useState<readonly VocabularyItem[]>([]);
  const [runId, setRunId] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [roundAnswers, setRoundAnswers] = useState<AnswerResult[]>([]);

  const [masteredWordIds, setMasteredWordIds] = useState<Set<string>>(
    () => new Set(),
  );

  const [roundMasteredWordIds, setRoundMasteredWordIds] = useState<Set<string>>(
    () => new Set(),
  );

  const [totalAnswered, setTotalAnswered] = useState(0);
  const [totalMistakes, setTotalMistakes] = useState(0);

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveErrors, setSaveErrors] = useState(0);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const questionStartedAt = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const isAnswerSavingRef = useRef(false);

  const questions = useMemo(
    () =>
      generateVocabularyExercise(roundItems, {
        distractorItems: vocabularyItems,
        random: createSeededRandom(runId),
      }),
    [roundItems, vocabularyItems, runId],
  );

  const currentQuestion = questions[currentIndex];
  const currentAnswer = roundAnswers[currentIndex];

  const masteredCount = vocabularyItems.filter((item) =>
    masteredWordIds.has(item.reference.id),
  ).length;

  useEffect(() => {
    if (phase === "active") {
      questionStartedAt.current = performance.now();
    }
  }, [currentIndex, phase, runId]);

  /**
   * Starts the exercise.
   *
   * Historical recognition records are loaded first.
   * Previously mastered words are skipped unless the user
   * explicitly chooses to practise the complete vocabulary again.
   */
  async function startExercise(practiseAll = false) {
    if (isLoadingHistory) {
      return;
    }

    setIsLoadingHistory(true);
    setHistoryError(null);

    try {
      const records = await learningRecordService.getAllRecords();

      const previouslyMastered = getMasteredWordIds(
        records,
        courseId,
        lessonId,
        activityId,
      );

      const initialQueue = practiseAll
        ? vocabularyItems
        : vocabularyItems.filter(
            (item) => !previouslyMastered.has(item.reference.id),
          );

      setMasteredWordIds(previouslyMastered);
      setRoundMasteredWordIds(
        practiseAll ? new Set() : new Set(previouslyMastered),
      );

      setRoundItems(initialQueue);
      setRoundAnswers([]);
      setCurrentIndex(0);
      setRoundNumber(1);
      setTotalAnswered(0);
      setTotalMistakes(0);
      setSaveErrors(0);

      sessionIdRef.current = crypto.randomUUID();

      setRunId((previous) => previous + 1);
      setPhase(initialQueue.length === 0 ? "completed" : "active");
    } catch {
      setHistoryError(
        "Learning history could not be loaded. Please try again.",
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }

  /**
   * Saves one answer as an independent recognition attempt.
   */
  async function selectAnswer(choiceId: string, answeredAt: number) {
    const sessionId = sessionIdRef.current;

    if (
      !currentQuestion ||
      currentAnswer ||
      isAnswerSavingRef.current ||
      !sessionId
    ) {
      return;
    }

    isAnswerSavingRef.current = true;

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

    setRoundAnswers((previous) => [...previous, answer]);
    setTotalAnswered((previous) => previous + 1);

    if (isCorrect) {
      setMasteredWordIds((previous) => {
        const next = new Set(previous);
        next.add(currentQuestion.item.id);
        return next;
      });

      setRoundMasteredWordIds((previous) => {
        const next = new Set(previous);
        next.add(currentQuestion.item.id);
        return next;
      });
    } else {
      setTotalMistakes((previous) => previous + 1);
    }

    setIsSaving(true);

    try {
      await learningRecordService.recordAttempt({
        recordType: "attempt",
        activity: "recognition",
        item: currentQuestion.item,
        context: {
          courseId,
          lessonId,
          activityId,
          sessionId,
        },
        details: {
          isCorrect,
          responseTimeMs,
        },
      });
    } catch {
      setSaveErrors((previous) => previous + 1);
    } finally {
      isAnswerSavingRef.current = false;
      setIsSaving(false);
    }
  }

  /**
   * Finishes the current round or moves to the next one.
   *
   * Only words not correctly recognized in this exercise
   * are included in the next round.
   */
  function goToNextQuestion() {
    if (!currentQuestion || !currentAnswer || isSaving) {
      return;
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((previous) => previous + 1);
      return;
    }

    const failedItems = roundItems.filter(
      (item) => !roundMasteredWordIds.has(item.reference.id),
    );

    if (failedItems.length === 0) {
      setPhase("completed");
      return;
    }

    setRoundItems(failedItems);
    setRoundAnswers([]);
    setCurrentIndex(0);
    setRoundNumber((previous) => previous + 1);
    setRunId((previous) => previous + 1);
  }

  if (vocabularyItems.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.emptyState}>
          <CircleX size={24} />
          <h2>Vocabulary exercise unavailable</h2>
          <p>This lesson does not contain vocabulary entries to practise.</p>
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
              Incorrectly answered words return in the next round until every
              word is recognized correctly.
            </p>
          </div>

          <button
            className={styles.primaryButton}
            onClick={() => void startExercise()}
            disabled={isLoadingHistory}
          >
            {isLoadingHistory ? "Loading history..." : "Start exercise"}
            {!isLoadingHistory && <ArrowRight size={16} />}
          </button>
        </div>

        {historyError && (
          <p className={styles.saveWarning} role="alert">
            {historyError}
          </p>
        )}
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
          <h2>All words recognized!</h2>

          <div className={styles.score}>
            <strong>{masteredCount}</strong>
            <span>/ {vocabularyItems.length}</span>
          </div>

          <p>
            Every vocabulary item has been recognized correctly at least once.
            You can now continue with the next learning activity.
          </p>

          <div className={styles.mistakes}>
            <h3>Exercise summary</h3>

            <div className={styles.mistake}>
              <span>Answers given</span>
              <strong>{totalAnswered}</strong>
            </div>

            <div className={styles.mistake}>
              <span>Incorrect answers</span>
              <strong>{totalMistakes}</strong>
            </div>

            <div className={styles.mistake}>
              <span>Rounds completed</span>
              <strong>{roundNumber}</strong>
            </div>
          </div>

          {saveErrors > 0 && (
            <p className={styles.saveWarning} role="status">
              {saveErrors} {saveErrors === 1 ? "answer was" : "answers were"}{" "}
              not saved to your learning history.
            </p>
          )}

          <button
            className={styles.primaryButton}
            onClick={() => void startExercise(true)}
            disabled={isLoadingHistory}
          >
            <RotateCcw size={16} />
            {isLoadingHistory
              ? "Loading history..."
              : "Practise all words again"}
          </button>

          {historyError && (
            <p className={styles.saveWarning} role="alert">
              {historyError}
            </p>
          )}
        </div>
      </section>
    );
  }

  if (questions.length !== roundItems.length || !currentQuestion) {
    return (
      <section className={styles.section}>
        <div className={styles.emptyState}>
          <CircleX size={24} />
          <h2>Exercise could not continue</h2>
          <p>
            Some vocabulary items do not have enough distinct meanings to
            generate answer choices. Check the vocabulary entries for this
            lesson before continuing.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.exercise}>
        <div className={styles.exerciseHeader}>
          <div>
            <span className={styles.eyebrow}>
              VOCABULARY PRACTICE · ROUND {roundNumber}
            </span>
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
            const isSelected = currentAnswer?.selectedChoiceId === choice.id;
            const isCorrect = choice.id === currentQuestion.correctChoiceId;

            const isIncorrectSelection =
              Boolean(currentAnswer) && isSelected && !currentAnswer?.isCorrect;

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
                onClick={() => void selectAnswer(choice.id, performance.now())}
              >
                <span className={styles.choiceLetter}>
                  {String.fromCharCode(65 + index)}
                </span>

                <span>{choice.text}</span>

                {currentAnswer && isCorrect && <CheckCircle2 size={18} />}

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
                ? "Well done. This word will not return in the next round."
                : `The correct answer is ${
                    currentQuestion.choices.find(
                      (choice) => choice.id === currentQuestion.correctChoiceId,
                    )?.text ?? ""
                  }. You will practise this word again.`}
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
                ? "Finish round"
                : "Next question"}

            {!isSaving && <ArrowRight size={16} />}
          </button>
        )}
      </div>
    </section>
  );
}
