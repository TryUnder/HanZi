import { useCallback, useState } from "react";
import {
  getWritingHistory,
  saveWritingSession,
} from "../../../services/storage/writingStorage";
import type {
  StoredWritingSession,
  WritingSessionResult,
} from "../types/writing";

interface UseWritingHistoryReturn {
  history: StoredWritingSession[];
  error: string | null;
  addSession: (result: WritingSessionResult) => StoredWritingSession | null;
  refreshHistory: () => void;
}

export function useWritingHistory(): UseWritingHistoryReturn {
  const [history, setHistory] = useState<StoredWritingSession[]>(() =>
    getWritingHistory(),
  );
  const [error, setError] = useState<string | null>(null);

  const refreshHistory = useCallback(() => {
    setHistory(getWritingHistory());
  }, []);

  const addSession = useCallback(
    (result: WritingSessionResult): StoredWritingSession | null => {
      try {
        const savedSession = saveWritingSession(result);

        setHistory((currentHistory) => [savedSession, ...currentHistory]);

        setError(null);

        return savedSession;
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "An unexpected error occurred while saving writing history.";

        setError(message);

        return null;
      }
    },
    [],
  );

  return {
    history,
    error,
    addSession,
    refreshHistory,
  };
}
