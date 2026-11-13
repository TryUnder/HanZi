import { useCallback, useEffect, useMemo, useState } from "react";
import { learningRecordService } from "../../../app/services/learningRecordService";
import { getLatestLearningStatuses } from "../../learning/domain/rules/getLatestLearningStatuses";
import type {
  LearningStatus,
  LearningStatusChanged,
} from "../../learning/domain/types";
import { characters } from "../data/characters";
import type { HskLevelFilter } from "../../../shared/domain/types/hsk";

function getItemKey(kind: "character" | "vocabulary", id: string): string {
  return `${kind}:${id}`;
}

function isActiveLearningStatus(status: LearningStatus | undefined): boolean {
  return status === "learning" || status === "needs-practice";
}

export function useLibrary(defaultLevel: HskLevelFilter = "all") {
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] =
    useState<HskLevelFilter>(defaultLevel);

  const [latestStatuses, setLatestStatuses] = useState<
    ReadonlyMap<string, LearningStatusChanged>
  >(() => new Map());

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshStatuses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const records = await learningRecordService.getAllRecords();
      setLatestStatuses(getLatestLearningStatuses(records));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load learning statuses.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    learningRecordService
      .getAllRecords()
      .then((records) => {
        if (!isActive) return;

        setLatestStatuses(getLatestLearningStatuses(records));
        setError(null);
      })
      .catch((caughtError: unknown) => {
        if (!isActive) return;

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load learning statuses.",
        );
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const filteredCharacters = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();

    return characters.filter((character) => {
      const matchesSearch =
        query.length === 0 ||
        character.simplified.includes(query) ||
        character.pinyin.toLocaleLowerCase().includes(query) ||
        character.meaning.toLocaleLowerCase().includes(query);

      const matchesLevel =
        selectedLevel === "all" || character.hskLevel === selectedLevel;

      return matchesSearch && matchesLevel;
    });
  }, [search, selectedLevel]);

  const learnedIds = useMemo(
    () =>
      characters
        .filter((character) =>
          isActiveLearningStatus(
            latestStatuses.get(getItemKey("character", character.id))?.status,
          ),
        )
        .map((character) => character.id),
    [latestStatuses],
  );

  const toggleLearned = useCallback(
    async (characterId: string) => {
      const key = getItemKey("character", characterId);
      const currentStatus = latestStatuses.get(key)?.status;
      const nextStatus: LearningStatus = isActiveLearningStatus(currentStatus)
        ? "not-learning"
        : "learning";

      setError(null);

      try {
        const record = await learningRecordService.changeStatus(
          { kind: "character", id: characterId },
          nextStatus,
        );

        setLatestStatuses((current) => {
          const next = new Map(current);
          next.set(key, record);
          return next;
        });
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not update the learning status.",
        );
      }
    },
    [latestStatuses],
  );

  return {
    search,
    setSearch,
    selectedLevel,
    setSelectedLevel,
    filteredCharacters,
    learnedIds,
    toggleLearned,
    isLoading,
    error,
    refreshStatuses,
  };
}
