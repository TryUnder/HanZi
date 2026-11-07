import { useState } from "react";
import { pronunciationExamples } from "../data/pronunciationExamples";
import { toneDefinitions } from "../data/toneDefinitions";
import type { MandarinTone } from "../types/speaking";
import { ToneContourChart } from "./ToneContourChart";
import styles from "./ToneTrainer.module.css";
import { PronunciationPlayer } from "./PronunciationPlayer";

export function ToneTrainer() {
  const [selectedTone, setSelectedTone] = useState<MandarinTone>(1);

  const selectedDefinition = toneDefinitions.find(
    (definition) => definition.tone === selectedTone,
  );

  const selectedExamples = pronunciationExamples.filter(
    (example) => example.tone === selectedTone,
  );

  if (!selectedDefinition) {
    return null;
  }

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Mandarin tones</h2>
          <p className={styles.description}>
            Explore the five tones of Mandarin Chinese.
          </p>
        </div>
      </div>

      <div
        className={styles.toneSelector}
        role="group"
        aria-label="Select a Mandarin tone"
      >
        {toneDefinitions.map((definition) => (
          <button
            key={definition.tone}
            type="button"
            className={`${styles.toneButton} ${
              selectedTone === definition.tone ? styles.toneButtonActive : ""
            }`}
            aria-pressed={selectedTone === definition.tone}
            onClick={() => setSelectedTone(definition.tone)}
          >
            <span className={styles.toneNumber}>
              {definition.tone === 5 ? "5" : definition.tone}
            </span>
            <span className={styles.toneName}>
              {definition.tone === 5 ? "Neutral" : `Tone ${definition.tone}`}
            </span>
          </button>
        ))}
      </div>

      <div className={styles.details}>
        <div className={styles.chartSection}>
          <div className={styles.sectionHeading}>
            <h3>{selectedDefinition.name}</h3>
            <span className={styles.toneBadge}>
              Tone {selectedDefinition.tone}
            </span>
          </div>

          <ToneContourChart definition={selectedDefinition} />

          <p className={styles.toneDescription}>
            {selectedDefinition.description}
          </p>
        </div>

        <div className={styles.examplesSection}>
          <h3 className={styles.examplesTitle}>Pronunciation examples</h3>

          {selectedExamples.length > 0 ? (
            <div className={styles.exampleList}>
              {selectedExamples.map((example) => (
                <article key={example.id} className={styles.example}>
                  <span className={styles.character}>{example.character}</span>

                  <div className={styles.exampleInfo}>
                    <span className={styles.pinyin}>{example.pinyin}</span>
                    <span className={styles.meaning}>{example.meaning}</span>
                  </div>

                  <PronunciationPlayer example={example} />
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.emptyExamples}>
              No pronunciation examples available yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
