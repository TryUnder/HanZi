
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  PenLine,
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
import styles from "./VocabularyWritingExercise.module.css";

interface VocabularyWritingExerciseProps {
  readonly items: readonly ResolvedLessonItem[];
  readonly courseId: string;
  readonly lessonId: string;
  readonly activityId: string;
}

interface PendingWritingAttempt {
  readonly wordId: string;
  readonly sessionId: string;
  readonly characters: readonly WritingCharacterResult[];
}

type ExercisePhase = "ready" | "active" | "completed";

const noOperation = () => {};

export function VocabularyWritingExercise({
  items,
  courseId,
  lessonId,
  activityId,
}: VocabularyWritingExerciseProps) {
  const vocabularyItems = useMemo(
    () =>
      items.filter(
        (
          item,
        ): item is Extract<ResolvedLessonItem, { kind: "vocabulary" }> =>
          item.kind === "vocabulary",
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
  const [saveError, setSaveError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const characterResultsRef = useRef<WritingCharacterResult[]>([]);
  const completionHandledRef = useRef(false);
  const isSavingRef = useRef(false);
  const strokeMistakesRef = useRef<Map<number, number>>(new Map());
  const pendingAttemptRef = useRef<PendingWritingAttempt | null>(null);

  const currentWord = vocabularyItems[wordIndex];
  const wordCharacters = currentWord
    ? Array.from(currentWord.data.simplified)
    : [];
  const currentCharacter = wordCharacters[characterIndex];

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
          kind: "vocabulary",
          ...totals,
          characters: pending.characters,
        },
      });

      pendingAttemptRef.current = null;
      setCompletedWords((previous) => previous + 1);

      const nextWordIndex = wordIndex + 1;

      if (nextWordIndex < vocabularyItems.length) {
        setWordIndex(nextWordIndex);
        setCharacterIndex(0);
        setCharacterResults([]);
        characterResultsRef.current = [];

        sessionIdRef.current = crypto.randomUUID();
        completionHandledRef.current = false;
        strokeMistakesRef.current.clear();
      } else {
        setPhase("completed");
      }
    } catch {
      setSaveError(
        "The writing result could not be saved. Please try saving again.",
      );
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [activityId, courseId, lessonId, vocabularyItems.length, wordIndex]);

  const handleMistake = useCallback((event: WritingMistakeEvent) => {
    strokeMistakesRef.current.set(
      event.strokeNum,
      event.mistakesOnStroke,
    );
  }, []);

  const handleCharacterComplete = useCallback(
    (result: PracticeCharacterResult) => {
      if (completionHandledRef.current) {
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

      const nextResults = [
        ...characterResultsRef.current,
        characterResult,
      ];

      characterResultsRef.current = nextResults;
      setCharacterResults(nextResults);

      if (characterIndex + 1 < wordCharacters.length) {
        strokeMistakesRef.current.clear();
        completionHandledRef.current = false;
        setCharacterIndex((previous) => previous + 1);
        return;
      }

      const sessionId = sessionIdRef.current;

      if (!sessionId || !currentWord) {
        setSaveError("The writing session could not be identified.");
        return;
      }

      pendingAttemptRef.current = {
        wordId: currentWord.data.id,
        sessionId,
        characters: nextResults,
      };

      void savePendingAttempt();
    },
    [
      characterIndex,
      currentWord,
      savePendingAttempt,
      wordCharacters.length,
    ],
  );

  function startExercise() {
    setWordIndex(0);
    setCharacterIndex(0);
    setCharacterResults([]);
    characterResultsRef.current = [];

    setCompletedWords(0);
    setSaveError(null);

    pendingAttemptRef.current = null;
    sessionIdRef.current = crypto.randomUUID();
    completionHandledRef.current = false;
    isSavingRef.current = false;
    strokeMistakesRef.current.clear();

    setPhase("active");
  }

  if (vocabularyItems.length === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.emptyState}>
          <PenLine size={24} />
          <h2>Writing exercise unavailable</h2>
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
            <PenLine size={23} />
          </div>

          <div className={styles.introContent}>
            <span className={styles.eyebrow}>WRITING PRACTICE</span>
            <h2>Write the vocabulary</h2>
            <p>
              Practise all {vocabularyItems.length} words from this lesson.
              Each word is treated as one writing session, with its characters
              practised individually.
            </p>
          </div>

          <button className={styles.primaryButton} onClick={startExercise}>
            Start writing
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

          <span className={styles.eyebrow}>WRITING COMPLETED</span>
          <h2>All words practised!</h2>

          <div className={styles.score}>
            <strong>{completedWords}</strong>
            <span>/ {vocabularyItems.length}</span>
          </div>

          <p>
            You have successfully completed the writing practice for every
            vocabulary item in this lesson.
          </p>

          <button className={styles.primaryButton} onClick={startExercise}>
            <RotateCcw size={16} />
            Practise again
          </button>
        </div>
      </section>
    );
  }

  if (!currentWord || !currentCharacter) {
    return null;
  }

  const currentPinyin =
    currentWord.data.readings.map((reading) => reading.pinyin).join(", ") ||
    "Pinyin unavailable";

  return (
    <section className={styles.section}>
      <div className={styles.exercise}>
        <div className={styles.exerciseHeader}>
          <div>
            <span className={styles.eyebrow}>WRITING PRACTICE</span>
            <h2>Write the characters</h2>
          </div>

          <span className={styles.progressLabel}>
            {completedWords + 1} / {vocabularyItems.length} words
          </span>
        </div>

        <div className={styles.progressTrack}>
          <div
            className={styles.progressValue}
            style={{
              width: `${(completedWords / vocabularyItems.length) * 100}%`,
            }}
          />
        </div>

        <div className={styles.wordCard}>
          <div className={styles.wordCharacters}>
            {wordCharacters.map((character, index) => (
              <span
                className={
                  index === characterIndex
                    ? `${styles.wordCharacter} ${styles.activeCharacter}`
                    : index < characterIndex
                      ? `${styles.wordCharacter} ${styles.completedCharacter}`
                      : styles.wordCharacter
                }
                key={`${currentWord.data.id}-${index}`}
              >
                {character}
                {index < characterIndex && <CheckCircle2 size={15} />}
              </span>
            ))}
          </div>

          <div className={styles.wordInfo}>
            <strong>{currentPinyin}</strong>
            <span>{currentWord.data.meanings.join("; ")}</span>
          </div>
        </div>

        <div className={styles.characterProgress}>
          <span>
            Character {characterIndex + 1} of {wordCharacters.length}
          </span>
          <span>{characterResults.length} completed</span>
        </div>

        <PracticeCanvas
          key={`${currentWord.data.id}-${characterIndex}`}
          character={currentCharacter}
          onCorrectStroke={noOperation}
          onMistake={handleMistake}
          onComplete={noOperation}
          onCompleteDetails={handleCharacterComplete}
        />

        {saveError && (
          <div className={styles.saveError} role="alert">
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

        {isSaving && (
          <p className={styles.savingMessage} role="status">
            Saving your writing session...
          </p>
        )}

        {characterIndex < wordCharacters.length - 1 && (
          <p className={styles.nextCharacterHint}>
            <ArrowRight size={15} />
            After completing this character, the next one will appear
            automatically.
          </p>
        )}
      </div>
    </section>
  );
}
