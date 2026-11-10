import { useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  PenLine,
} from "lucide-react";
import { CharacterCanvas } from "../../writing/components/CharacterCanvas";
import styles from "./VocabularyStrokeOrder.module.css";

interface VocabularyStrokeOrderProps {
  readonly word: string;
}

export function VocabularyStrokeOrder({ word }: VocabularyStrokeOrderProps) {
  const characters = Array.from(word);

  const [isExpanded, setIsExpanded] = useState(false);
  const [characterIndex, setCharacterIndex] = useState(0);

  const currentCharacter = characters[characterIndex];

  function toggleExpanded() {
    setIsExpanded((previous) => !previous);
  }

  function selectPreviousCharacter() {
    setCharacterIndex((previous) => Math.max(0, previous - 1));
  }

  function selectNextCharacter() {
    setCharacterIndex((previous) =>
      Math.min(characters.length - 1, previous + 1),
    );
  }

  if (characters.length === 0 || !currentCharacter) {
    return null;
  }

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.toggleButton}
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
      >
        <span className={styles.toggleLabel}>
          <PenLine size={16} />
          Show stroke order
        </span>

        {isExpanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>

      {isExpanded && (
        <div className={styles.preview}>
          <div className={styles.previewHeader}>
            <div>
              <span className={styles.eyebrow}>CHARACTER WRITING</span>
              <h3>Stroke order</h3>
            </div>

            <span className={styles.counter}>
              {characterIndex + 1} / {characters.length}
            </span>
          </div>

          {characters.length > 1 && (
            <div
              className={styles.characterSelector}
              aria-label="Choose character"
            >
              {characters.map((character, index) => (
                <button
                  type="button"
                  key={`${character}-${index}`}
                  className={
                    index === characterIndex
                      ? `${styles.characterButton} ${styles.activeCharacter}`
                      : styles.characterButton
                  }
                  onClick={() => setCharacterIndex(index)}
                  aria-pressed={index === characterIndex}
                >
                  {character}
                </button>
              ))}
            </div>
          )}

          <CharacterCanvas
            key={`${word}-${characterIndex}`}
            character={currentCharacter}
          />

          {characters.length > 1 && (
            <div className={styles.navigation}>
              <button
                type="button"
                className={styles.navigationButton}
                onClick={selectPreviousCharacter}
                disabled={characterIndex === 0}
              >
                <ChevronLeft size={16} />
                Previous
              </button>

              <button
                type="button"
                className={styles.navigationButton}
                onClick={selectNextCharacter}
                disabled={characterIndex === characters.length - 1}
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <p className={styles.hint}>
            Watch the animation to learn the correct stroke order and direction.
          </p>
        </div>
      )}
    </div>
  );
}
