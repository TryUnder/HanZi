import { useCallback, useEffect, useRef, useState } from "react";

import { statisticsService } from "../../../app/services/statisticsService";

import type { LearningStatistics } from "../domain/types/statistics";

interface UseLearningStatisticsResult {
  readonly statistics: LearningStatistics | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refreshStatistics: () => Promise<void>;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unable to load learning statistics.";
}

export function useLearningStatistics(): UseLearningStatisticsResult {
  const [statistics, setStatistics] = useState<LearningStatistics | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const operationIdRef = useRef(0);

  useEffect(() => {
    const operationId = ++operationIdRef.current;

    statisticsService
      .getStatistics()
      .then((result) => {
        if (operationIdRef.current !== operationId) {
          return;
        }

        setStatistics(result);
        setError(null);
      })
      .catch((caughtError: unknown) => {
        if (operationIdRef.current !== operationId) {
          return;
        }

        setError(getErrorMessage(caughtError));
      })
      .finally(() => {
        if (operationIdRef.current === operationId) {
          setIsLoading(false);
        }
      });

    return () => {
      operationIdRef.current += 1;
    };
  }, []);

  const refreshStatistics = useCallback(async (): Promise<void> => {
    const operationId = ++operationIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const result = await statisticsService.getStatistics();

      if (operationIdRef.current !== operationId) {
        return;
      }

      setStatistics(result);
    } catch (caughtError) {
      if (operationIdRef.current !== operationId) {
        return;
      }

      setError(getErrorMessage(caughtError));
    } finally {
      if (operationIdRef.current === operationId) {
        setIsLoading(false);
      }
    }
  }, []);

  return {
    statistics,
    isLoading,
    error,
    refreshStatistics,
  };
}
