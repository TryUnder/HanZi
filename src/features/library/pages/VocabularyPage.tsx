import { useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { LibraryTabs } from "../components/LibraryTabs";
import { VocabularyCard } from "../components/VocabularyCard";
import { VocabularyDetails } from "../components/VocabularyDetails";
import { useVocabulary } from "../hooks/useVocabulary";
import type { HskLevel } from "../types/character";
import styles from "./VocabularyPage.module.css";

export function VocabularyPage() {
  const {
    search,
    setSearch,
    selectedLevel,
    setSelectedLevel,
    filteredVocabulary,
    vocabularyCount,
    resultCount,
    verifiedCount,
    unreviewedCount,
  } = useVocabulary();

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedVocabulary =
    filteredVocabulary.find((entry) => entry.id === selectedId) ??
    filteredVocabulary[0] ??
    null;

  function handleLevelChange(value: string) {
    setSelectedLevel(value === "all" ? "all" : (Number(value) as HskLevel));
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>YOUR CHINESE KNOWLEDGE BASE</span>
          <h1>Vocabulary</h1>
          <p>
            Explore Chinese words, their pronunciation, meanings and examples.
          </p>
        </div>

        <div className={styles.libraryCount}>
          <BookOpen size={19} />
          <div>
            <strong>{vocabularyCount.toLocaleString()}</strong>
            <span>words in dictionary</span>
          </div>
        </div>
      </header>

      <LibraryTabs />

      <section className={styles.statistics} aria-label="Vocabulary statistics">
        <div className={styles.statItem}>
          <strong>{vocabularyCount.toLocaleString()}</strong>
          <span>Total words</span>
        </div>
        <div className={styles.statItem}>
          <strong>{verifiedCount.toLocaleString()}</strong>
          <span>Verified</span>
        </div>
        <div className={styles.statItem}>
          <strong>{unreviewedCount.toLocaleString()}</strong>
          <span>Not reviewed</span>
        </div>
      </section>

      <section className={styles.toolbar} aria-label="Vocabulary filters">
        <label className={styles.searchBox}>
          <Search size={18} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search Chinese, Pinyin or meaning..."
            aria-label="Search vocabulary"
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

      <div className={styles.resultsHeader}>
        <h2>Vocabulary</h2>
        <span>{resultCount.toLocaleString()} results</span>
      </div>

      <div className={styles.libraryLayout}>
        <section className={styles.resultsSection}>
          {filteredVocabulary.length > 0 ? (
            <div className={styles.vocabularyGrid}>
              {filteredVocabulary.map((entry) => (
                <VocabularyCard
                  key={entry.id}
                  vocabulary={entry}
                  isSelected={selectedVocabulary?.id === entry.id}
                  onSelect={() => setSelectedId(entry.id)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <Search size={25} />
              <h3>No vocabulary found</h3>
              <p>Try another search phrase or change the HSK filter.</p>
            </div>
          )}
        </section>

        {selectedVocabulary && (
          <VocabularyDetails vocabulary={selectedVocabulary} />
        )}
      </div>
    </div>
  );
}
