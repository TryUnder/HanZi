import { Volume2 } from "lucide-react";
import { PronunciationPlayer } from "../../speaking/components/PronunciationPlayer";
import type { VocabularyDisplay } from "../domain/vocabulary/vocabularyDisplay";
import styles from "../pages/VocabularyPage.module.css";

interface VocabularyDetailsProps {
  readonly vocabulary: VocabularyDisplay;
}

export function VocabularyDetails({ vocabulary }: VocabularyDetailsProps) {
  const primaryReading = vocabulary.readings[0];

  return (
    <aside className={styles.detailsPanel}>
      <div className={styles.detailsHeader}>
        <span>VOCABULARY DETAILS</span>
        <span className={styles.detailsLevel}>
          {vocabulary.hskLevels.length > 0
            ? vocabulary.hskLevels.map((level) => `HSK ${level}`).join(" · ")
            : "Unclassified"}
        </span>
      </div>

      <div className={styles.detailsCharacter}>{vocabulary.simplified}</div>

      <div className={styles.detailsPronunciation}>
        <PronunciationPlayer
          audioUrl={vocabulary.audioUrl}
          text={vocabulary.simplified}
          label={primaryReading?.pinyin ?? vocabulary.simplified}
        />

        {vocabulary.readings.map((reading) => (
          <div className={styles.reading} key={reading.pinyin}>
            <h2>{reading.pinyin}</h2>

            {reading.traditionalForms.length > 0 && (
              <p className={styles.traditionalForms}>
                Traditional: {reading.traditionalForms.join(", ")}
              </p>
            )}

            {reading.definitions.length > 0 && (
              <ul className={styles.definitionList}>
                {reading.definitions.map((definition, index) => (
                  <li key={`${reading.pinyin}-${index}`}>{definition}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {vocabulary.traditionalVariants.length > 0 && (
        <section className={styles.detailSection}>
          <h3>Traditional variants</h3>
          <p>{vocabulary.traditionalVariants.join("、")}</p>
        </section>
      )}

      {vocabulary.meanings.length > 0 && (
        <section className={styles.detailSection}>
          <h3>Polish meanings</h3>
          <ul className={styles.definitionList}>
            {vocabulary.meanings.map((meaning, index) => (
              <li key={`${meaning}-${index}`}>{meaning}</li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.examples}>
        <h3>Example sentences</h3>

        {vocabulary.examples.length > 0 ? (
          vocabulary.examples.map((example, index) => (
            <div
              className={styles.example}
              key={`${example.simplified}-${index}`}
            >
              <strong>{example.simplified}</strong>
              <span>{example.pinyin}</span>
              <span>{example.meaning}</span>
            </div>
          ))
        ) : (
          <p>No examples available yet.</p>
        )}
      </section>

      {vocabulary.notes.length > 0 && (
        <section className={styles.detailSection}>
          <h3>Learning notes</h3>
          {vocabulary.notes.map((note, index) => (
            <p key={`${note}-${index}`}>{note}</p>
          ))}
        </section>
      )}

      <div className={styles.verificationStatus}>
        {vocabulary.isVerified ? (
          <>
            <Volume2 size={15} />
            <span>Polish learning content verified</span>
          </>
        ) : (
          <span>Polish learning content not reviewed yet</span>
        )}
      </div>
    </aside>
  );
}
