import { Lightbulb } from "lucide-react";
import type { GrammarPoint } from "../domain/types/lesson";
import styles from "./LessonGrammar.module.css";

interface LessonGrammarProps {
  readonly grammar: readonly GrammarPoint[];
}

export function LessonGrammar({ grammar }: LessonGrammarProps) {
  if (grammar.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <div>
          <span className={styles.eyebrow}>GRAMMAR & LANGUAGE NOTES</span>
          <h2>Grammar & Language Rules</h2>
          <p>
            Kluczowe reguły fonetyczne, gramatyczne i zwroty językowe w tej
            lekcji.
          </p>
        </div>

        <span className={styles.count}>
          {grammar.length} {grammar.length === 1 ? "rule" : "rules"}
        </span>
      </header>

      <div className={styles.grammarList}>
        {grammar.map((point, index) => (
          <article className={styles.grammarCard} key={point.id}>
            <div className={styles.cardHeader}>
              <div className={styles.headerTitleWrapper}>
                <div className={styles.ruleNumber}>
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3>{point.title}</h3>
              </div>

              {point.structure && (
                <div className={styles.structureBadge}>{point.structure}</div>
              )}
            </div>

            <p className={styles.explanation}>{point.explanation}</p>

            {point.examples.length > 0 && (
              <div className={styles.examplesContainer}>
                <span className={styles.examplesHeading}>Przykłady użycia</span>
                <div className={styles.exampleGrid}>
                  {point.examples.map((example, exIndex) => (
                    <div className={styles.exampleCard} key={exIndex}>
                      <span className={styles.exampleChinese}>
                        {example.chinese}
                      </span>
                      <div className={styles.exampleMeta}>
                        <span className={styles.examplePinyin}>
                          {example.pinyin}
                        </span>
                        <span className={styles.exampleTranslation}>
                          • {example.translation}
                        </span>
                      </div>
                      {example.explanation && (
                        <span className={styles.exampleExplanation}>
                          {example.explanation}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {point.notes && point.notes.length > 0 && (
              <div className={styles.notesBox}>
                <Lightbulb size={16} />
                <div>
                  {point.notes.map((note, noteIndex) => (
                    <div key={noteIndex}>{note}</div>
                  ))}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
