
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  CircleAlert,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { learningRecordService } from "../../../../app/services/learningRecordService";
import type { WritingCharacterResult } from "../../../learning/domain/types";
import { PracticeCanvas } from "../../../writing/components/PracticeCanvas";
import type {
  PracticeCharacterResult,
  StrokeMistake,
  WritingMistakeEvent,
} from "../../../writing/types/writing";
import type { ResolvedLessonItem } from "../../application/services/lessonContentService";
import styles from "./MemoryWritingExercise.module.css";

interface MemoryWritingExerciseProps {
  readonly items: readonly ResolvedLessonItem[];
  readonly courseId: string;
  readonly lessonId: string;
  readonly activityId: string;
}

interface PendingMemoryAttempt {
  readonly wordId: string;
  readonly sessionId: string;
  readonly characters: readonly WritingCharacterResult[];
}

type ExercisePhase = "ready" | "active" | "word-completed" | "completed";

type VocabularyItem = Extract<ResolvedLessonItem, { kind: "vocabulary" }>;

const noOperation = () => {};

export function MemoryWritingExercise({
  items,
  courseId,
  lessonId,
  activityId,
}: MemoryWritingExerciseProps) {
  const vocabularyItems = useMemo(
    () =>
      items.filter(
        (item): item is VocabularyItem => item.kind === "vocabulary",
      ),
    [items],
  );

  const [phase, setPhase] = useState<ExercisePhase>("ready");
  const [wordIndex, setWordIndex] = useState(0);
  const [characterIndex, setCharacterIndex] = useState(0);
  const [characterResults, setCharacterResults] = useState<
    WritingCharacterResult[]
  >([]);
  const [completedWords, setCompletedWords] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPendingAttempt, setHasPendingAttempt] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const characterResultsRef = useRef<WritingCharacterResult[]>([]);
  const completionHandledRef = useRef(false);
  const isSavingRef = useRef(false);
  const strokeMistakesRef = useRef<Map<number, number>>(new Map());
  const pendingAttemptRef = useRef<PendingMemoryAttempt | null>(null);

  const currentWord = vocabularyItems[wordIndex];

  const wordCharacters = currentWord
    ? Array.from(currentWord.data.simplified)
    : [];

  const currentCharacter = wordCharacters[characterIndex];

  const currentPinyin =
    currentWord?.data.readings[0]?.pinyin ?? "Pinyin unavailable";

  const currentMeaning =
    currentWord?.data.meanings[0] ?? "Meaning unavailable";

  const beginExercise = () => {
    setWordIndex(0);
    setCharacterIndex(0);
    setCharacterResults([]);
    setCompletedWords(0);
    setIsSaving(false);
    setHasPendingAttempt(false);
    setSaveError(null);

    characterResultsRef.current = [];
    pendingAttemptRef.current = null;
    sessionIdRef.current = crypto.randomUUID();

    completionHandledRef.current = false;
    isSavingRef.current = false;
    strokeMistakesRef.current.clear();

    setPhase("active");
  };

  const savePendingAttempt = useCallback(async () => {
    const pending = pendingAttemptRef.current;

    if (!pending || isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setSaveError(null);

    const totals = pending.characters.reduce(
      (result, character) => ({
        correctStrokes: result.correctStrokes + character.correctStrokes,
        totalStrokes: result.totalStrokes + character.totalStrokes,
        mistakes: result.mistakes + character.mistakes,
      }),
      {
        correctStrokes: 0,
        totalStrokes: 0,
        mistakes: 0,
      },
    );

    try {
      await learningRecordService.recordAttempt({
        recordType: "attempt",
        activity: "writing",
        item: {
          kind: "vocabulary",
          id: pending.wordId,
        },
        context: {
          courseId,
          lessonId,
          activityId,
          sessionId: pending.sessionId,
        },
        details: {
          kind: "memory",
          ...totals,
          characters: pending.characters,
        },
      });

      pendingAttemptRef.current = null;
      setHasPendingAttempt(false);
      setCompletedWords((previous) => previous + 1);
    } catch {
      setSaveError(
        "The writing result could not be saved. Please try saving again.",
      );
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [activityId, courseId, lessonId]);

  const handleMistake = useCallback((event: WritingMistakeEvent) => {
    strokeMistakesRef.current.set(event.strokeNum, event.mistakesOnStroke);
  }, []);

  const handleCharacterComplete = useCallback(
    (result: PracticeCharacterResult) => {
      if (completionHandledRef.current || !currentWord) {
        return;
      }

      completionHandledRef.current = true;

      const strokeMistakes: StrokeMistake[] = Array.from(
        strokeMistakesRef.current.entries(),
      )
        .map(([strokeIndex, mistakes]) => ({
          strokeIndex,
          mistakes,
        }))
        .sort((first, second) => first.strokeIndex - second.strokeIndex);

      const characterResult: WritingCharacterResult = {
        character: result.character,
        correctStrokes: result.correctStrokes,
        totalStrokes: result.totalStrokes,
        mistakes: result.totalMistakes,
        ...(strokeMistakes.length > 0 ? { strokeMistakes } : {}),
      };

      const nextResults = [...characterResultsRef.current, characterResult];

      characterResultsRef.current = nextResults;
      setCharacterResults(nextResults);

      if (characterIndex + 1 < wordCharacters.length) {
        strokeMistakesRef.current.clear();
        completionHandledRef.current = false;
        setCharacterIndex((previous) => previous + 1);
        return;
      }

      const sessionId = sessionIdRef.current;

      if (!sessionId) {
        setSaveError("The writing session could not be identified.");
        return;
      }

      pendingAttemptRef.current = {
        wordId: currentWord.reference.id,
        sessionId,
        characters: nextResults,
      };

      setHasPendingAttempt(true);
      setPhase("word-completed");
      void savePendingAttempt();
    },
    [
      characterIndex,
      currentWord,
      savePendingAttempt,
      wordCharacters.length,
    ],
  );

  const handleNextWord = () => {
    if (isSaving || hasPendingAttempt) {
      return;
    }

    if (wordIndex + 1 >= vocabularyItems.length) {
      setPhase("completed");
      return;
    }

    setWordIndex((previous) => previous + 1);
    setCharacterIndex(0);
    setCharacterResults([]);

    characterResultsRef.current = [];
    sessionIdRef.current = crypto.randomUUID();

    completionHandledRef.current = false;
    strokeMistakesRef.current.clear();
    setSaveError(null);
    setPhase("active");
  };

  if (vocabularyItems.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.emptyState}>
          <Brain size={24} />
          <h2>Memory writing unavailable</h2>
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
            <Brain size={23} />
          </div>

          <div className={styles.introContent}>
            <span className={styles.eyebrow}>MEMORY WRITING</span>
            <h2>Write from memory</h2>
            <p>
              Recall the Chinese characters using only their Pinyin and
              meaning. The characters will be revealed after you finish
              writing each word.
            </p>
          </div>

          <button className={styles.primaryButton} onClick={beginExercise}>
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

          <span className={styles.eyebrow}>MEMORY WRITING COMPLETED</span>
          <h2>Exercise finished!</h2>

          <div className={styles.resultStat}>
            <strong>{completedWords}</strong>
            <span>Words practised</span>
          </div>

          <p>
            You have completed the memory-writing exercise for this lesson.
            Your results have been saved in your learning history.
          </p>

          <button className={styles.secondaryButton} onClick={beginExercise}>
            <RotateCcw size={16} />
            Practise all words again
          </button>
        </div>
      </section>
    );
  }

  if (!currentWord || !currentCharacter) {
    return null;
  }

  const currentWordProgress =
    phase === "word-completed"
      ? 1
      : characterIndex / wordCharacters.length;

  const progress =
    ((wordIndex + currentWordProgress) / vocabularyItems.length) * 100;

  return (
    <section className={styles.section}>
      <div className={styles.exercise}>
        <div className={styles.exerciseHeader}>
          <div>
            <span className={styles.eyebrow}>MEMORY WRITING</span>
            <h2>Write from memory</h2>
          </div>

          <span className={styles.progressLabel}>
            {wordIndex + 1} / {vocabularyItems.length} words
          </span>
        </div>

        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label="Exercise progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <div
            className={styles.progressValue}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className={styles.promptCard}>
          <span className={styles.promptLabel}>WRITE THE CHINESE WORD</span>
          <strong className={styles.promptPinyin}>{currentPinyin}</strong>
          <span className={styles.promptMeaning}>{currentMeaning}</span>
        </div>

        {phase === "active" && (
          <>
            <div className={styles.characterProgress}>
              <span>
                Character {characterIndex + 1} of {wordCharacters.length}
              </span>
              <span>{characterResults.length} completed</span>
            </div>

            <PracticeCanvas
              key={`${currentWord.reference.id}-${characterIndex}`}
              character={currentCharacter}
              onCorrectStroke={noOperation}
              onMistake={handleMistake}
              onComplete={noOperation}
              onCompleteDetails={handleCharacterComplete}
              showOutline={false}
              showHintAfterMisses={999}
              hintText="Write the character from memory. No outline is shown."
            />

            {characterIndex < wordCharacters.length - 1 && (
              <p className={styles.nextCharacterHint}>
                <ArrowRight size={15} />
                The next character will appear automatically after this one.
              </p>
            )}
          </>
        )}

        {phase === "word-completed" && (
          <div className={styles.revealCard}>
            <div className={styles.revealHeader}>
              <CheckCircle2 size={19} />
              <strong>Correct word</strong>
            </div>

            <div className={styles.revealedWord}>
              {currentWord.data.simplified}
            </div>

            <p>
              {characterResults.every((character) => character.mistakes === 0)
                ? "Excellent! You wrote every character without mistakes."
                : "Word completed. Review the correct character forms and keep practising."}
            </p>

            {isSaving && (
              <p className={styles.savingMessage} role="status">
                Saving your result...
              </p>
            )}

            {saveError && (
              <div className={styles.saveError} role="alert">
                <CircleAlert size={17} />
                <p>{saveError}</p>
                <button
                  className={styles.primaryButton}
                  disabled={isSaving}
                  onClick={() => void savePendingAttempt()}
                >
                  {isSaving ? "Saving..." : "Retry saving"}
                </button>
              </div>
            )}

            <button
              className={styles.primaryButton}
              disabled={isSaving || hasPendingAttempt}
              onClick={handleNextWord}
            >
              {wordIndex + 1 < vocabularyItems.length
                ? "Next word"
                : "Finish exercise"}
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
