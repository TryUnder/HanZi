import { Check, Plus } from "lucide-react";
import type { ChineseCharacter } from "../types/character";
import styles from "../pages/LibraryPage.module.css";

interface CharacterCardProps {
  character: ChineseCharacter;
  isLearned: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

export function CharacterCard({
  character,
  isLearned,
  isSelected,
  onSelect,
}: CharacterCardProps) {
  return (
    <button
      className={`${styles.characterCard} ${isSelected ? styles.selected : ""}`}
      onClick={onSelect}
      type="button"
      aria-pressed={isSelected}
    >
      <span className={styles.cardLevel}>HSK {character.hskLevel}</span>
      <span className={styles.cardCharacter}>{character.simplified}</span>
      <strong className={styles.cardPinyin}>{character.pinyin}</strong>
      <span className={styles.cardMeaning}>{character.meaning}</span>
      <span className={styles.cardLearned}>
        {isLearned ? <Check size={14} /> : <Plus size={14} />}
        {isLearned ? "In your learning list" : "Add to learning"}
      </span>
    </button>
  );
}
