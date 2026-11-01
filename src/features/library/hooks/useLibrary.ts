import { useMemo, useState } from "react";
import { characters } from "../data/characters";
import type { HskLevel } from "../types/character";
import {
  readLearnedCharacters,
  writeLearnedCharacters,
} from "../../../services/storage/localStorage";

export function useLibrary() {
  const [search, setSearch] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<HskLevel | "all">("all");
  const [learnedIds, setLearnedIds] = useState<string[]>(readLearnedCharacters);

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

  function toggleLearned(characterId: string) {
    setLearnedIds((currentIds) => {
      const nextIds = currentIds.includes(characterId)
        ? currentIds.filter((id) => id !== characterId)
        : [...currentIds, characterId];

      writeLearnedCharacters(nextIds);
      return nextIds;
    });
  }

  return {
    search,
    setSearch,
    selectedLevel,
    setSelectedLevel,
    filteredCharacters,
    learnedIds,
    toggleLearned,
  };
}
