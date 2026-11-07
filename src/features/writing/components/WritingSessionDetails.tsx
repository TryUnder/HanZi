import type { ChineseCharacter } from "../../library/types/character";
import type { WritingHistoryEntry } from "../types/writingHistory";
import styles from "./WritingSessionDetails.module.css";

interface WritingSessionDetailsProps {
  session: WritingHistoryEntry;
  character: ChineseCharacter | undefined;
  onClose: () => void;
}

function formatCompletionDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function WritingSessionDetails({
  session,
  character,
  onClose,
}: WritingSessionDetailsProps) {
  const mistakesByStroke = Array.from(
    { length: session.totalStrokes },
    (_, strokeIndex) => ({
      strokeIndex,
      mistakes:
        session.strokeMistakes.find((item) => item.strokeIndex === strokeIndex)
          ?.mistakes ?? 0,
    }),
  );

  const maxMistakes = Math.max(
    1,
    ...mistakesByStroke.map((stroke) => stroke.mistakes),
  );

  const strokesWithMistakes = mistakesByStroke.filter(
    (stroke) => stroke.mistakes > 0,
  ).length;

  return (
    <section
      className={styles.container}
      aria-labelledby="session-details-title"
    >
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>WRITING HISTORY</span>
          <h2 id="session-details-title" className={styles.title}>
            Session details
          </h2>
        </div>

        <button className={styles.closeButton} onClick={onClose} type="button">
          Back to history
        </button>
      </header>

      <div className={styles.characterSection}>
        <div className={styles.character}>{session.character}</div>

        <div className={styles.characterInfo}>
          <h3>{character?.pinyin ?? "Unknown pronunciation"}</h3>
          <p>{character?.meaning ?? "Unknown character"}</p>
          <span>{formatCompletionDate(session.completedAt)}</span>
        </div>
      </div>

      <div className={styles.statistics}>
        <div className={styles.statistic}>
          <span className={styles.statisticValue}>
            {session.correctStrokes}/{session.totalStrokes}
          </span>
          <span className={styles.statisticLabel}>Correct strokes</span>
        </div>

        <div className={styles.statistic}>
          <span className={styles.statisticValue}>{session.mistakes}</span>
          <span className={styles.statisticLabel}>Total mistakes</span>
        </div>

        <div className={styles.statistic}>
          <span className={styles.statisticValue}>{strokesWithMistakes}</span>
          <span className={styles.statisticLabel}>Strokes with mistakes</span>
        </div>
      </div>

      <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <div>
            <h3>Mistakes by stroke</h3>
            <p>Number of mistakes made on each individual stroke.</p>
          </div>
        </div>

        {session.mistakes === 0 ? (
          <div className={styles.successMessage}>
            Excellent! No mistakes were made during this session.
          </div>
        ) : (
          <div className={styles.chart}>
            {mistakesByStroke.map((stroke) => {
              const barWidth = (stroke.mistakes / maxMistakes) * 100;

              return (
                <div className={styles.chartRow} key={stroke.strokeIndex}>
                  <span className={styles.strokeLabel}>
                    Stroke {stroke.strokeIndex + 1}
                  </span>

                  <div
                    className={styles.barTrack}
                    role="meter"
                    aria-label={`Mistakes on stroke ${stroke.strokeIndex + 1}`}
                    aria-valuemin={0}
                    aria-valuemax={maxMistakes}
                    aria-valuenow={stroke.mistakes}
                  >
                    <div
                      className={
                        stroke.mistakes > 0
                          ? styles.barWithMistakes
                          : styles.barWithoutMistakes
                      }
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  <span className={styles.mistakeCount}>{stroke.mistakes}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
