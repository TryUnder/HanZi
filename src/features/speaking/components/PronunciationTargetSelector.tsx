import type { ChineseCharacter } from "../../library/types/character";
import styles from "./PronunciationTargetSelector.module.css";

interface PronunciationTargetSelectorProps {
  characters: ChineseCharacter[];
  selectedCharacterId: string;
  onCharacterChange: (characterId: string) => void;
}

const TONE_NAMES: Record<ChineseCharacter["tone"], string> = {
  1: "High and level",
  2: "Rising",
  3: "Low and dipping",
  4: "Falling",
  5: "Neutral",
};

export function PronunciationTargetSelector({
  characters,
  selectedCharacterId,
  onCharacterChange,
}: PronunciationTargetSelectorProps) {
  const selectedCharacter = characters.find(
    (character) => character.id === selectedCharacterId,
  );

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <span className={styles.eyebrow}>PRONUNCIATION TARGET</span>
        <h3 className={styles.title}>Choose a character to practice</h3>
        <p className={styles.description}>
          Select a character from your library to practice its pronunciation and
          tone.
        </p>
      </div>

      <label className={styles.label} htmlFor="pronunciation-character">
        Chinese character
      </label>

      <select
        id="pronunciation-character"
        className={styles.select}
        value={selectedCharacterId}
        onChange={(event) => onCharacterChange(event.target.value)}
      >
        {characters.map((character) => (
          <option key={character.id} value={character.id}>
            {character.simplified} — {character.pinyin} ({character.meaning})
          </option>
        ))}
      </select>

      {selectedCharacter && (
        <div className={styles.characterDetails}>
          <div className={styles.characterSymbol}>
            {selectedCharacter.simplified}
          </div>

          <div className={styles.characterInfo}>
            <h4 className={styles.pinyin}>{selectedCharacter.pinyin}</h4>
            <p className={styles.meaning}>{selectedCharacter.meaning}</p>

            <div className={styles.metadata}>
              <span className={styles.tone}>
                Tone {selectedCharacter.tone} –{" "}
                {TONE_NAMES[selectedCharacter.tone]}
              </span>

              <span className={styles.level}>
                HSK {selectedCharacter.hskLevel}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
