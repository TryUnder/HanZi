import { useState } from "react";
import { Search, BookOpen } from "lucide-react";
import { CharacterCard } from "../components/CharacterCard";
import { CharacterDetails } from "../components/CharacterDetails";
import { useLibrary } from "../hooks/useLibrary";
import type { HskLevel } from "../types/character";
import styles from "./LibraryPage.module.css";

export function LibraryPage() {
  const {
    search,
    setSearch,
    selectedLevel,
    setSelectedLevel,
    filteredCharacters,
    learnedIds,
    toggleLearned,
  } = useLibrary();

  const [selectedId, setSelectedId] = useState<string | null>("ni");

  const selectedCharacter =
    filteredCharacters.find((character) => character.id === selectedId) ??
    filteredCharacters[0] ??
    null;

  function handleLevelChange(value: string) {
    setSelectedLevel(value === "all" ? "all" : (Number(value) as HskLevel));
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>YOUR CHINESE KNOWLEDGE BASE</span>
          <h1>Character library</h1>
          <p>
            Explore Chinese characters, understand their meaning and build your
            vocabulary.
          </p>
        </div>

        <div className={styles.libraryCount}>
          <BookOpen size={19} />
          <div>
            <strong>{learnedIds.length}</strong>
            <span>in your learning list</span>
          </div>
        </div>
      </header>

      <section className={styles.toolbar} aria-label="Library filters">
        <label className={styles.searchBox}>
          <Search size={18} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search characters, pinyin or meaning..."
            aria-label="Search characters"
          />
        </label>

        <label className={styles.levelFilter}>
          <span>HSK level</span>
          <select
            value={selectedLevel}
            onChange={(event) => handleLevelChange(event.target.value)}
          >
            <option value="all">All levels</option>
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <option key={level} value={level}>
                HSK {level}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className={styles.libraryLayout}>
        <section className={styles.resultsSection}>
          <div className={styles.resultsHeader}>
            <h2>Characters</h2>
            <span>{filteredCharacters.length} results</span>
          </div>

          {filteredCharacters.length > 0 ? (
            <div className={styles.characterGrid}>
              {filteredCharacters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  isLearned={learnedIds.includes(character.id)}
                  isSelected={selectedCharacter?.id === character.id}
                  onSelect={() => setSelectedId(character.id)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Search size={25} />
              <h3>No characters found</h3>
              <p>Try another search phrase or change the HSK filter.</p>
            </div>
          )}
        </section>

        {selectedCharacter && (
          <CharacterDetails
            character={selectedCharacter}
            isLearned={learnedIds.includes(selectedCharacter.id)}
            onToggleLearned={() => toggleLearned(selectedCharacter.id)}
          />
        )}
      </div>
    </div>
  );
}
