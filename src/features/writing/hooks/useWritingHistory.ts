import { useCallback, useEffect, useState } from "react";
import { learningRecordService } from "../../../app/services/learningRecordService";
import type {
  CharacterWritingAttemptDetails,
  LearningItemReference,
  LearningRecord,
} from "../../learning/domain/types";
import type { ChineseCharacter } from "../../library/types/character";
import type { WritingHistoryEntry } from "../types/writingHistory";
import type { WritingSessionResult } from "../types/writing";

interface UseWritingHistoryReturn {
  history: WritingHistoryEntry[];
  error: string | null;
  isLoading: boolean;
  addSession: (
    result: WritingSessionResult,
  ) => Promise<WritingHistoryEntry | null>;
  refreshHistory: () => Promise<void>;
}

type WritingAttemptRecord = Extract<
  LearningRecord,
  { recordType: "attempt"; activity: "writing" }
>;

type CharacterWritingAttemptRecord = WritingAttemptRecord & {
  readonly item: Extract<LearningItemReference, { kind: "character" }>;
  readonly details: CharacterWritingAttemptDetails;
};

function isCharacterWritingAttempt(
  record: LearningRecord,
): record is CharacterWritingAttemptRecord {
  return (
    record.recordType === "attempt" &&
    record.activity === "writing" &&
    record.item.kind === "character" &&
    !("kind" in record.details)
  );
}

function toWritingHistoryEntry(
  record: CharacterWritingAttemptRecord,
  characters: readonly ChineseCharacter[],
): WritingHistoryEntry | null {
  const character = characters.find((item) => item.id === record.item.id);

  if (!character) {
    return null;
  }

  return {
    id: record.id,
    characterId: character.id,
    character: character.simplified,
    correctStrokes: record.details.correctStrokes,
    totalStrokes: record.details.totalStrokes,
    mistakes: record.details.mistakes,
    completedAt: record.occurredAt,
    strokeMistakes: record.details.strokeMistakes ?? [],
  };
}

function getErrorMessage(caughtError: unknown): string {
  return caughtError instanceof Error
    ? caughtError.message
    : "An unexpected error occurred while accessing writing history.";
}

export function useWritingHistory(
  characters: readonly ChineseCharacter[],
): UseWritingHistoryReturn {
  const [history, setHistory] = useState<WritingHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshHistory = useCallback(async () => {
    setIsLoading(true);

    try {
      const records = await learningRecordService.getAllRecords();

      const writingHistory = records
        .filter(isCharacterWritingAttempt)
        .map((record) => toWritingHistoryEntry(record, characters))
        .filter((entry): entry is WritingHistoryEntry => entry !== null)
        .sort(
          (first, second) =>
            new Date(second.completedAt).getTime() -
            new Date(first.completedAt).getTime(),
        );

      setHistory(writingHistory);
      setError(null);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }, [characters]);

  useEffect(() => {
    let isActive = true;

    const loadHistory = async () => {
      try {
        const records = await learningRecordService.getAllRecords();

        const writingHistory = records
          .filter(isCharacterWritingAttempt)
          .map((record) => toWritingHistoryEntry(record, characters))
          .filter((entry): entry is WritingHistoryEntry => entry !== null)
          .sort(
            (first, second) =>
              new Date(second.completedAt).getTime() -
              new Date(first.completedAt).getTime(),
          );

        if (isActive) {
          setHistory(writingHistory);
          setError(null);
        }
      } catch (caughtError) {
        if (isActive) {
          setError(getErrorMessage(caughtError));
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      isActive = false;
    };
  }, [characters]);

  const addSession = useCallback(
    async (
      result: WritingSessionResult,
    ): Promise<WritingHistoryEntry | null> => {
      const character = characters.find(
        (item) => item.id === result.characterId,
      );

      if (!character) {
        setError("The character for this writing session could not be found.");
        return null;
      }

      try {
        const record = await learningRecordService.recordAttempt({
          item: {
            kind: "character",
            id: result.characterId,
          },
          recordType: "attempt",
          activity: "writing",
          details: {
            correctStrokes: result.correctStrokes,
            totalStrokes: result.totalStrokes,
            mistakes: result.mistakes,
            strokeMistakes: result.strokeMistakes ?? [],
          },
        });

        if (!isCharacterWritingAttempt(record)) {
          throw new Error(
            "The saved record is not a character writing attempt.",
          );
        }

        const entry = toWritingHistoryEntry(record, characters);

        if (!entry) {
          throw new Error(
            "The character for this writing session could not be found.",
          );
        }

        setHistory((currentHistory) =>
          [entry, ...currentHistory].sort(
            (first, second) =>
              new Date(second.completedAt).getTime() -
              new Date(first.completedAt).getTime(),
          ),
        );

        setError(null);

        return entry;
      } catch (caughtError) {
        setError(getErrorMessage(caughtError));
        return null;
      }
    },
    [characters],
  );

  return {
    history,
    error,
    isLoading,
    addSession,
    refreshHistory,
  };
}
