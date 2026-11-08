import { Check, Plus } from "lucide-react";
import type { ChineseCharacter } from "../types/character";
import { PronunciationPlayer } from "../../speaking/components/PronunciationPlayer";
import styles from "../pages/LibraryPage.module.css";

interface CharacterDetailsProps {
  character: ChineseCharacter;
  isLearned: boolean;
  isDisabled?: boolean;
  onToggleLearned: () => void;
}

export function CharacterDetails({
  character,
  isLearned,
  isDisabled = false,
  onToggleLearned,
}: CharacterDetailsProps) {
  return (
    <aside className={styles.detailsPanel}>
      <div className={styles.detailsHeader}>
        <span>CHARACTER DETAILS</span>
        <span className={styles.detailsLevel}>HSK {character.hskLevel}</span>
      </div>

      <div className={styles.detailsCharacter}>{character.simplified}</div>

      <div className={styles.detailsPronunciation}>
        <h2>{character.pinyin}</h2>
        <PronunciationPlayer
          audioUrl={character.audioUrl ?? null}
          text={character.simplified}
          label={character.pinyin}
        />
      </div>

      <p className={styles.detailsMeaning}>{character.meaning}</p>

      <div className={styles.detailsFacts}>
        <div>
          <span>RADICAL</span>
          <strong>{character.radical}</strong>
        </div>
        <div>
          <span>STROKES</span>
          <strong>{character.strokes}</strong>
        </div>
        <div>
          <span>TONE</span>
          <strong>{character.tone}</strong>
        </div>
      </div>

      <button
        className={styles.learnButton}
        onClick={onToggleLearned}
        type="button"
        disabled={isDisabled}
        aria-busy={isDisabled}
      >
        {isLearned ? <Check size={16} /> : <Plus size={16} />}
        {isDisabled
          ? "Loading..."
          : isLearned
            ? "Remove from learning list"
            : "Add to learning list"}
      </button>

      <div className={styles.examples}>
        <h3>Example words</h3>

        {character.examples.length > 0 ? (
          character.examples.map((example) => (
            <div className={styles.example} key={example.word}>
              <strong>{example.word}</strong>
              <span>{example.pinyin}</span>
              <span>{example.meaning}</span>
            </div>
          ))
        ) : (
          <p>No examples available yet.</p>
        )}
      </div>
    </aside>
  );
}
