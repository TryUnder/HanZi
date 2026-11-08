import { BookOpen, CheckCircle2 } from "lucide-react";
import { PronunciationPlayer } from "../../speaking/components/PronunciationPlayer";
import type { VocabularyDisplay } from "../domain/vocabulary/vocabularyDisplay";
import styles from "../pages/VocabularyPage.module.css";

interface VocabularyCardProps {
  readonly vocabulary: VocabularyDisplay;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
}

export function VocabularyCard({
  vocabulary,
  isSelected,
  onSelect,
}: VocabularyCardProps) {
  const primaryReading = vocabulary.readings[0];
  const primaryDefinition =
    vocabulary.meanings[0] ?? primaryReading?.definitions[0] ?? "No definition";

  return (
    <article
      className={`${styles.vocabularyCardWrapper} ${
        isSelected ? styles.selected : ""
      }`}
    >
      <button
        className={styles.vocabularyCard}
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
      >
        <div className={styles.cardTopRow}>
          <span className={styles.cardLevel}>
            {vocabulary.hskLevels.length > 0
              ? vocabulary.hskLevels.map((level) => `HSK ${level}`).join(" · ")
              : "Not classified"}
          </span>

          {vocabulary.isVerified && (
            <CheckCircle2
              className={styles.verifiedIcon}
              size={15}
              aria-label="Verified vocabulary"
            />
          )}
        </div>

        <span className={styles.cardCharacter}>{vocabulary.simplified}</span>

        <strong className={styles.cardPinyin}>
          {primaryReading?.pinyin ?? "Pronunciation unavailable"}
        </strong>

        <span className={styles.cardMeaning}>{primaryDefinition}</span>

        <span className={styles.cardReadingCount}>
          <BookOpen size={13} />
          {vocabulary.readings.length}{" "}
          {vocabulary.readings.length === 1 ? "reading" : "readings"}
        </span>
      </button>

      <div className={styles.cardAudio}>
        <PronunciationPlayer
          audioUrl={vocabulary.audioUrl}
          text={vocabulary.simplified}
          label={primaryReading?.pinyin ?? vocabulary.simplified}
        />
      </div>
    </article>
  );
}
