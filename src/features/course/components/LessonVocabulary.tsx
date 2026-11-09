import { BookOpen, CheckCircle2 } from "lucide-react";
import { PronunciationPlayer } from "../../speaking/components/PronunciationPlayer";
import type { ResolvedLessonItem } from "../application/services/lessonContentService";
import styles from "./LessonVocabulary.module.css";

interface LessonVocabularyProps {
  readonly items: readonly ResolvedLessonItem[];
}

export function LessonVocabulary({ items }: LessonVocabularyProps) {
  const vocabularyItems = items.filter(
    (item): item is Extract<ResolvedLessonItem, { kind: "vocabulary" }> =>
      item.kind === "vocabulary",
  );

  if (vocabularyItems.length === 0) {
    return (
      <div className={styles.emptyState}>
        <BookOpen size={24} />
        <h3>No vocabulary available</h3>
        <p>This lesson does not contain any vocabulary yet.</p>
      </div>
    );
  }

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <div>
          <span className={styles.eyebrow}>LESSON MATERIAL</span>
          <h2>Vocabulary</h2>
          <p>Learn the words, their pronunciation and meanings.</p>
        </div>

        <span className={styles.count}>{vocabularyItems.length} words</span>
      </header>

      <div className={styles.wordList}>
        {vocabularyItems.map(({ reference, data }, index) => {
          const primaryReading = data.readings[0];

          return (
            <article className={styles.wordCard} key={reference.id}>
              <div className={styles.wordNumber}>
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className={styles.wordMain}>
                <div className={styles.wordHeader}>
                  <span className={styles.chinese}>{data.simplified}</span>

                  {data.isVerified && (
                    <CheckCircle2
                      className={styles.verified}
                      size={15}
                      aria-label="Verified vocabulary"
                    />
                  )}
                </div>

                <div className={styles.reading}>
                  {data.readings.length > 0
                    ? data.readings.map((reading) => reading.pinyin).join(" · ")
                    : "Pronunciation unavailable"}
                </div>

                <div className={styles.meanings}>
                  {data.meanings.length > 0
                    ? data.meanings.join("; ")
                    : (primaryReading?.definitions.join("; ") ??
                      "Meaning unavailable")}
                </div>

                {data.examples.length > 0 && (
                  <div className={styles.examples}>
                    {data.examples.slice(0, 2).map((example, exampleIndex) => (
                      <p key={`${reference.id}-example-${exampleIndex}`}>
                        <strong>{example.simplified}</strong>
                        <span>{example.pinyin}</span>
                        <span>{example.meaning}</span>
                      </p>
                    ))}
                  </div>
                )}

                <div className={styles.metadata}>
                  {data.hskLevels.map((level) => (
                    <span key={level}>HSK {level}</span>
                  ))}
                  {data.traditionalVariants.length > 0 && (
                    <span>
                      Traditional: {data.traditionalVariants.join(", ")}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.audio}>
                <PronunciationPlayer
                  audioUrl={data.audioUrl}
                  text={data.simplified}
                  label={primaryReading?.pinyin ?? data.simplified}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
