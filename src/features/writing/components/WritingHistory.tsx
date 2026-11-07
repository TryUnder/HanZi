import { useState } from "react";
import type { ChineseCharacter } from "../../library/types/character";
import type { WritingHistoryEntry } from "../types/writingHistory";
import { WritingSessionDetails } from "./WritingSessionDetails";
import styles from "./WritingHistory.module.css";

interface WritingHistoryProps {
  history: WritingHistoryEntry[];
  characters: readonly ChineseCharacter[];
}

function formatCompletionDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function WritingHistory({ history, characters }: WritingHistoryProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    null,
  );

  const characterMap = new Map(
    characters.map((character) => [character.id, character]),
  );

  const uniqueCharacters = new Set(
    history.map((session) => session.characterId),
  ).size;

  const averageMistakes =
    history.length > 0
      ? history.reduce((total, session) => total + session.mistakes, 0) /
        history.length
      : 0;

  const selectedSession = history.find(
    (session) => session.id === selectedSessionId,
  );

  const selectedCharacter = selectedSession
    ? characterMap.get(selectedSession.characterId)
    : undefined;

  function handleSessionSelect(sessionId: string) {
    setSelectedSessionId((currentId) =>
      currentId === sessionId ? null : sessionId,
    );
  }

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Writing history</h2>
          <p className={styles.description}>
            Your completed character practice sessions.
          </p>
        </div>

        {history.length > 0 && (
          <span className={styles.sessionCount}>{history.length} sessions</span>
        )}
      </div>

      {history.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyCharacter}>汉</span>
          <h3>No completed sessions yet</h3>
          <p>Complete your first writing exercise to see your progress here.</p>
        </div>
      ) : (
        <>
          <div className={styles.statistics}>
            <div className={styles.statistic}>
              <span className={styles.statisticValue}>{history.length}</span>
              <span className={styles.statisticLabel}>Completed sessions</span>
            </div>

            <div className={styles.statistic}>
              <span className={styles.statisticValue}>{uniqueCharacters}</span>
              <span className={styles.statisticLabel}>Unique characters</span>
            </div>

            <div className={styles.statistic}>
              <span className={styles.statisticValue}>
                {averageMistakes.toFixed(1)}
              </span>
              <span className={styles.statisticLabel}>Average mistakes</span>
            </div>
          </div>

          <div className={styles.sessionList}>
            {history.map((session) => {
              const character = characterMap.get(session.characterId);
              const isSelected = selectedSessionId === session.id;

              return (
                <button
                  aria-pressed={isSelected}
                  className={`${styles.session} ${
                    isSelected ? styles.selectedSession : ""
                  }`}
                  key={session.id}
                  onClick={() => handleSessionSelect(session.id)}
                  type="button"
                >
                  <span className={styles.character}>{session.character}</span>

                  <div className={styles.sessionInfo}>
                    <div className={styles.characterHeading}>
                      <span className={styles.pinyin}>
                        {character?.pinyin ?? "Unknown pronunciation"}
                      </span>

                      <span className={styles.meaning}>
                        {character?.meaning ?? "Unknown character"}
                      </span>
                    </div>

                    <span className={styles.date}>
                      {formatCompletionDate(session.completedAt)}
                    </span>
                  </div>

                  <div className={styles.sessionMetrics}>
                    <span className={styles.strokeCount}>
                      {session.totalStrokes} strokes
                    </span>

                    <span
                      className={
                        session.mistakes === 0
                          ? styles.noMistakes
                          : styles.mistakes
                      }
                    >
                      {session.mistakes}{" "}
                      {session.mistakes === 1 ? "mistake" : "mistakes"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedSession && (
            <WritingSessionDetails
              session={selectedSession}
              character={selectedCharacter}
              onClose={() => setSelectedSessionId(null)}
            />
          )}
        </>
      )}
    </section>
  );
}
