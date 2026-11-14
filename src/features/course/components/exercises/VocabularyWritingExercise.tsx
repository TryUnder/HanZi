import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  PenLine,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { learningRecordService } from "../../../../app/services/learningRecordService";
import { learningSessionService } from "../../../../app/services/learningSessionService";
import type {
  LearningRecord,
  WritingCharacterResult,
} from "../../../learning/domain/types";
import type { StartLearningSessionInput } from "../../../../features/learning/application/services/LearningSessionService";
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
  readonly record: LearningRecord;
}

interface PendingCharacterAttempt {
  readonly sessionId: string;
  readonly result: WritingCharacterResult;
  readonly record: LearningRecord;
}

type ExercisePhase = "ready" | "active" | "completed";

type VocabularyItem = Extract<ResolvedLessonItem, { kind: "vocabulary" }>;

const noOperation = () => {};

function getMasteredWordIds(
  records: readonly LearningRecord[],
  courseId: string,
  lessonId: string,
  activityId: string,
): Set<string> {
  const masteredWordIds = new Set<string>();

  for (const record of records) {
    if (
      record.recordType !== "attempt" ||
      record.activity !== "writing" ||
      record.item.kind !== "vocabulary" ||
      !("kind" in record.details) ||
      record.details.kind !== "vocabulary"
    ) {
      continue;
    }

    if (
      record.context?.courseId !== courseId ||
      record.context.lessonId !== lessonId ||
      record.context.activityId !== activityId
    ) {
      continue;
    }

    const hasNoMistakes =
      record.details.mistakes === 0 &&
      record.details.characters.length > 0 &&
      record.details.characters.every((character) => character.mistakes === 0);

    if (hasNoMistakes) {
      masteredWordIds.add(record.item.id);
    }
  }

  return masteredWordIds;
}

export function VocabularyWritingExercise({
  items,
  courseId,
  lessonId,
  activityId,
}: VocabularyWritingExerciseProps) {
  const vocabularyItems = useMemo(
    () =>
      items.filter(
        (item): item is VocabularyItem => item.kind === "vocabulary",
      ),
    [items],
  );

  const [phase, setPhase] = useState<ExercisePhase>("ready");
  const [activeWords, setActiveWords] =
    useState<readonly VocabularyItem[]>(vocabularyItems);
  const [wordIndex, setWordIndex] = useState(0);
  const [characterIndex, setCharacterIndex] = useState(0);
  const [characterResults, setCharacterResults] = useState<
    WritingCharacterResult[]
  >([]);
  const [masteredWordIds, setMasteredWordIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [attemptedWordIds, setAttemptedWordIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const pendingSessionInputRef = useRef<StartLearningSessionInput | null>(null);

  const pendingSessionQueueKeyRef = useRef<string | null>(null);
  const characterResultsRef = useRef<WritingCharacterResult[]>([]);
  const completionHandledRef = useRef(false);
  const isSavingRef = useRef(false);
  const strokeMistakesRef = useRef<Map<number, number>>(new Map());
  const pendingCharacterRef = useRef<PendingCharacterAttempt | null>(null);
  const pendingAttemptRef = useRef<PendingWritingAttempt | null>(null);

  const currentWord = activeWords[wordIndex];
  const wordCharacters = currentWord
    ? Array.from(currentWord.data.simplified)
    : [];
  const currentCharacter = wordCharacters[characterIndex];

  const failedWords = useMemo(
    () =>
      vocabularyItems.filter((item) => !masteredWordIds.has(item.reference.id)),
    [masteredWordIds, vocabularyItems],
  );

  const beginQueue = async (words: readonly VocabularyItem[]) => {
    if (words.length === 0 || isSavingRef.current) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const context = {
        courseId,
        lessonId,
        activityId,
      };

      const queueKey = words.map((item) => item.reference.id).join("\u001f");

      const pendingSession = pendingSessionInputRef.current;

      const canReusePendingSession =
        pendingSession !== null &&
        pendingSessionQueueKeyRef.current === queueKey &&
        pendingSession.exerciseType === "writing-practice" &&
        pendingSession.totalItems === words.length &&
        pendingSession.context?.courseId === courseId &&
        pendingSession.context?.lessonId === lessonId &&
        pendingSession.context?.activityId === activityId;

      const sessionInput: StartLearningSessionInput = canReusePendingSession
        ? pendingSession
        : {
            id: crypto.randomUUID(),
            startedAt: new Date().toISOString(),
            exerciseType: "writing-practice",
            totalItems: words.length,
            context,
          };

      pendingSessionInputRef.current = sessionInput;
      pendingSessionQueueKeyRef.current = queueKey;

      const session = await learningSessionService.startSession(sessionInput);

      sessionIdRef.current = session.id;
      pendingSessionInputRef.current = null;
      pendingSessionQueueKeyRef.current = null;
      setActiveWords(words);
      setWordIndex(0);
      setCharacterIndex(0);
      setCharacterResults([]);
      characterResultsRef.current = [];
      pendingCharacterRef.current = null;
      pendingAttemptRef.current = null;
      completionHandledRef.current = false;
      strokeMistakesRef.current.clear();
      setPhase("active");
    } catch {
      setSaveError(
        "The writing session could not be started. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const startExercise = async () => {
    if (isLoadingHistory || isSavingRef.current) {
      return;
    }

    setIsLoadingHistory(true);
    setSaveError(null);

    try {
      const records = await learningRecordService.getAllRecords();
      const previouslyMastered = getMasteredWordIds(
        records,
        courseId,
        lessonId,
        activityId,
      );

      setMasteredWordIds(previouslyMastered);
      setAttemptedWordIds(new Set());
      await beginQueue(vocabularyItems);
    } catch {
      setSaveError("Writing history could not be loaded. Please try again.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const startFailedWordsAgain = () => {
    void beginQueue(failedWords);
  };

  const advanceToNextWord = useCallback(() => {
    const nextWordIndex = wordIndex + 1;

    if (nextWordIndex < activeWords.length) {
      setWordIndex(nextWordIndex);
      setCharacterIndex(0);
      setCharacterResults([]);
      characterResultsRef.current = [];
      completionHandledRef.current = false;
      strokeMistakesRef.current.clear();
      pendingCharacterRef.current = null;
      pendingAttemptRef.current = null;
      return;
    }

    setPhase("completed");
  }, [activeWords.length, wordIndex]);

  const savePendingAttempt = useCallback(
    async (alreadyLocked = false) => {
      const pending = pendingAttemptRef.current;

      if (!pending || (isSavingRef.current && !alreadyLocked)) {
        return;
      }

      isSavingRef.current = true;
      setIsSaving(true);
      setSaveError(null);

      try {
        await learningRecordService.saveRecord(pending.record);

        const completedItems = wordIndex + 1;

        await learningSessionService.updateProgress(
          pending.sessionId,
          completedItems,
        );

        setAttemptedWordIds((previous) => {
          const next = new Set(previous);
          next.add(pending.wordId);
          return next;
        });

        if (pending.characters.every((character) => character.mistakes === 0)) {
          setMasteredWordIds((previous) => {
            const next = new Set(previous);
            next.add(pending.wordId);
            return next;
          });
        }

        if (completedItems === activeWords.length) {
          await learningSessionService.completeSession(pending.sessionId);
          pendingAttemptRef.current = null;
          setPhase("completed");
        } else {
          pendingAttemptRef.current = null;
          advanceToNextWord();
        }
      } catch {
        setSaveError(
          "The writing result or session progress could not be saved. Please try again.",
        );
      } finally {
        isSavingRef.current = false;
        setIsSaving(false);
      }
    },
    [activeWords.length, advanceToNextWord, wordIndex],
  );

  const savePendingCharacter = useCallback(async () => {
    const pending = pendingCharacterRef.current;

    if (!pending || isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    setSaveError(null);

    try {
      await learningRecordService.saveRecord(pending.record);

      pendingCharacterRef.current = null;

      const nextCharacterIndex = characterIndex + 1;

      if (nextCharacterIndex < wordCharacters.length) {
        strokeMistakesRef.current.clear();
        completionHandledRef.current = false;
        setCharacterIndex(nextCharacterIndex);
      } else {
        const word = currentWord;

        if (!word) {
          throw new Error("The writing word could not be identified.");
        }

        const totals = characterResultsRef.current.reduce(
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

        const aggregateRecord = learningRecordService.createAttempt({
          recordType: "attempt",
          activity: "writing",
          item: {
            kind: "vocabulary",
            id: word.reference.id,
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
            characters: characterResultsRef.current,
          },
        });

        pendingAttemptRef.current = {
          wordId: word.reference.id,
          sessionId: pending.sessionId,
          characters: characterResultsRef.current,
          record: aggregateRecord,
        };

        await savePendingAttempt(true);
      }
    } catch {
      setSaveError(
        "The character result could not be saved. Please try saving again.",
      );
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [
    activityId,
    characterIndex,
    courseId,
    currentWord,
    lessonId,
    savePendingAttempt,
    wordCharacters.length,
  ]);

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

      const sessionId = sessionIdRef.current;

      if (!sessionId) {
        setSaveError("The writing session could not be identified.");
        return;
      }

      const record = learningRecordService.createAttempt({
        recordType: "attempt",
        activity: "writing",
        item: {
          kind: "character",
          id: characterResult.character,
        },
        context: {
          courseId,
          lessonId,
          activityId,
          sessionId,
        },
        details: {
          kind: "vocabulary-character",
          correctStrokes: characterResult.correctStrokes,
          totalStrokes: characterResult.totalStrokes,
          mistakes: characterResult.mistakes,
          ...(characterResult.strokeMistakes
            ? { strokeMistakes: characterResult.strokeMistakes }
            : {}),
        },
      });

      pendingCharacterRef.current = {
        sessionId,
        result: characterResult,
        record,
      };

      void savePendingCharacter();
    },
    [activityId, courseId, currentWord, lessonId, savePendingCharacter],
  );

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
              Practise all {vocabularyItems.length} words from this lesson. Each
              word is one writing session, with its characters practised
              individually. Words with mistakes can be practised again.
            </p>
          </div>

          <button
            className={styles.primaryButton}
            onClick={() => void startExercise()}
            disabled={isLoadingHistory || isSaving}
          >
            {isLoadingHistory ? "Loading history..." : "Start writing"}
            <ArrowRight size={16} />
          </button>
        </div>

        {saveError && (
          <div className={styles.saveError} role="alert">
            <p>{saveError}</p>
          </div>
        )}
      </section>
    );
  }

  if (phase === "completed") {
    const masteredCount = vocabularyItems.filter((item) =>
      masteredWordIds.has(item.reference.id),
    ).length;

    return (
      <section className={styles.section}>
        <div className={styles.results}>
          <div className={styles.resultsIcon}>
            <Trophy size={28} />
          </div>

          <span className={styles.eyebrow}>WRITING ROUND COMPLETED</span>
          <h2>Practice round finished!</h2>

          <div className={styles.resultStats}>
            <div className={styles.resultStat}>
              <strong>{attemptedWordIds.size}</strong>
              <span>Practised</span>
            </div>
            <div className={styles.resultStat}>
              <strong>{masteredCount}</strong>
              <span>Mastered</span>
            </div>
            <div className={styles.resultStat}>
              <strong>{failedWords.length}</strong>
              <span>Need practice</span>
            </div>
          </div>

          <p>
            A word is mastered when every character has been written without
            mistakes at least once. You can return to the remaining words
            whenever you are ready.
          </p>

          {failedWords.length > 0 && (
            <div className={styles.failedWords}>
              <div className={styles.failedWordsHeader}>
                <CircleAlert size={17} />
                <strong>Words to practise again</strong>
              </div>

              <div className={styles.failedWordList}>
                {failedWords.map((item) => (
                  <span
                    className={styles.failedWord}
                    key={item.reference.id}
                    title={item.data.meanings.join("; ")}
                  >
                    {item.data.simplified}
                  </span>
                ))}
              </div>

              <button
                className={styles.primaryButton}
                onClick={startFailedWordsAgain}
                disabled={isSaving}
              >
                <RotateCcw size={16} />
                Practise these words again
              </button>
            </div>
          )}

          {failedWords.length === 0 && (
            <p>
              <CheckCircle2 size={16} />
              All vocabulary words have been mastered!
            </p>
          )}

          <button
            className={styles.secondaryButton}
            onClick={() => void startExercise()}
            disabled={isLoadingHistory || isSaving}
          >
            <RotateCcw size={16} />
            {isLoadingHistory ? "Loading history..." : "Practise all words"}
          </button>

          {saveError && (
            <div className={styles.saveError} role="alert">
              <p>{saveError}</p>
            </div>
          )}
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
            {wordIndex + 1} / {activeWords.length} words
          </span>
        </div>

        <div className={styles.progressTrack}>
          <div
            className={styles.progressValue}
            style={{
              width: `${(wordIndex / activeWords.length) * 100}%`,
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
                key={`${currentWord.reference.id}-${index}`}
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
          key={`${currentWord.reference.id}-${characterIndex}`}
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
              onClick={() => {
                if (pendingCharacterRef.current) {
                  void savePendingCharacter();
                } else {
                  void savePendingAttempt();
                }
              }}
            >
              {isSaving ? "Saving..." : "Retry saving"}
            </button>
          </div>
        )}

        {isSaving && (
          <p className={styles.savingMessage} role="status">
            Saving your writing result...
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
