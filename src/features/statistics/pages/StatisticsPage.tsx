import {
  Activity,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  Layers,
  RefreshCw,
  Target,
} from "lucide-react";

import { useLearningStatistics } from "../hooks/useLearningStatistics";
import type { LearningActivity } from "../../learning/domain/types";

import styles from "./StatisticsPage.module.css";

const activityLabels: Record<LearningActivity, string> = {
  writing: "Writing",
  speaking: "Speaking",
  listening: "Listening",
  recognition: "Recognition",
  flashcard: "Flashcards",
};

const activityDescriptions: Record<LearningActivity, string> = {
  writing: "Character stroke practice",
  speaking: "Pronunciation practice",
  listening: "Listening comprehension",
  recognition: "Character recognition",
  flashcard: "Vocabulary review",
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "No activity yet";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function StatisticsPage() {
  const { statistics, isLoading, error, refreshStatistics } =
    useLearningStatistics();

  if (isLoading && !statistics) {
    return (
      <main className={styles.page}>
        <div className={styles.stateCard}>
          Loading your learning statistics...
        </div>
      </main>
    );
  }

  if (error && !statistics) {
    return (
      <main className={styles.page}>
        <div className={styles.stateCard}>
          <h2>Statistics could not be loaded</h2>
          <p>{error}</p>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void refreshStatistics()}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (!statistics) {
    return null;
  }

  const { overview, activities, items, dailyActivity } = statistics;

  const maxDailyAttempts = Math.max(
    1,
    ...dailyActivity.map((day) => day.attemptCount),
  );

  const mostDifficultItems = items
    .filter((item) => item.difficultyRate !== null)
    .slice(0, 5);

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>YOUR LEARNING JOURNEY</span>
          <h1>Statistics</h1>
          <p>Understand your progress and discover what to practise next.</p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => void refreshStatistics()}
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? styles.spinning : ""} />
          Refresh
        </button>
      </header>

      {error && (
        <div className={styles.inlineError} role="alert">
          Could not refresh statistics: {error}
        </div>
      )}

      <section className={styles.overviewGrid} aria-label="Learning overview">
        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.purple}`}>
            <Target size={19} />
          </div>
          <span className={styles.metricLabel}>TOTAL ATTEMPTS</span>
          <strong className={styles.metricValue}>
            {overview.attemptCount.toLocaleString()}
          </strong>
          <span className={styles.metricHint}>Recorded exercise attempts</span>
        </article>

        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.green}`}>
            <BookOpen size={19} />
          </div>
          <span className={styles.metricLabel}>ITEMS STUDIED</span>
          <strong className={styles.metricValue}>
            {overview.distinctItemCount.toLocaleString()}
          </strong>
          <span className={styles.metricHint}>Characters and vocabulary</span>
        </article>

        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.orange}`}>
            <CalendarDays size={19} />
          </div>
          <span className={styles.metricLabel}>TRACKED SESSIONS</span>
          <strong className={styles.metricValue}>
            {overview.trackedSessionCount.toLocaleString()}
          </strong>
          <span className={styles.metricHint}>Records with a session ID</span>
        </article>

        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.blue}`}>
            <Layers size={19} />
          </div>
          <span className={styles.metricLabel}>TOTAL RECORDS</span>
          <strong className={styles.metricValue}>
            {overview.recordCount.toLocaleString()}
          </strong>
          <span className={styles.metricHint}>
            {overview.statusChangeCount.toLocaleString()} status changes
            included
          </span>
        </article>
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>CONSISTENCY</span>
              <h2>Learning activity</h2>
            </div>
            <Activity size={19} className={styles.panelIcon} />
          </div>

          {dailyActivity.length === 0 ? (
            <div className={styles.emptyState}>
              No exercise activity has been recorded yet.
            </div>
          ) : (
            <>
              <div className={styles.activityChart}>
                {dailyActivity.slice(-14).map((day) => {
                  const height = Math.max(
                    5,
                    (day.attemptCount / maxDailyAttempts) * 100,
                  );

                  return (
                    <div className={styles.dayColumn} key={day.date}>
                      <span className={styles.dayValue}>
                        {day.attemptCount}
                      </span>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.bar}
                          style={{ height: `${height}%` }}
                          title={`${day.attemptCount} attempts`}
                        />
                      </div>
                      <span className={styles.dayLabel}>
                        {formatDate(day.date)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className={styles.chartCaption}>
                Daily exercise attempts · Last 14 active days
              </p>
            </>
          )}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>BREAKDOWN</span>
              <h2>Exercise types</h2>
            </div>
            <ChartNoAxesCombined size={19} className={styles.panelIcon} />
          </div>

          {activities.length === 0 ? (
            <div className={styles.emptyState}>
              Exercise statistics will appear here after your first practice.
            </div>
          ) : (
            <div className={styles.activityList}>
              {activities.map((activity) => (
                <div className={styles.activityItem} key={activity.activity}>
                  <div className={styles.activityInfo}>
                    <div>
                      <strong>{activityLabels[activity.activity]}</strong>
                      <span>{activityDescriptions[activity.activity]}</span>
                    </div>
                    <div className={styles.activityNumbers}>
                      <strong>{activity.attemptCount}</strong>
                      <span>
                        {activity.accuracyRate === null
                          ? "—"
                          : `${Math.round(activity.accuracyRate * 100)}%`}
                      </span>
                    </div>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${
                          (activity.attemptCount / overview.attemptCount) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className={styles.chartCaption}>
            Attempts · Accuracy where objectively measurable
          </p>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.panelEyebrow}>FOCUS AREAS</span>
            <h2>Items that need more practice</h2>
          </div>
          <Target size={19} className={styles.panelIcon} />
        </div>

        {mostDifficultItems.length === 0 ? (
          <div className={styles.emptyState}>
            Not enough evaluated attempts yet to identify difficult items.
          </div>
        ) : (
          <div className={styles.difficultList}>
            {mostDifficultItems.map((item) => (
              <div
                className={styles.difficultItem}
                key={`${item.item.kind}:${item.item.id}`}
              >
                <div className={styles.itemIdentity}>
                  <span className={styles.itemKind}>
                    {item.item.kind === "character"
                      ? "Character"
                      : "Vocabulary"}
                  </span>
                  <strong>{item.item.id}</strong>
                </div>

                <div className={styles.itemAttempts}>
                  {item.attemptCount} attempts
                </div>

                <div className={styles.difficulty}>
                  <div className={styles.difficultyTrack}>
                    <div
                      className={styles.difficultyFill}
                      style={{
                        width: `${(item.difficultyRate ?? 0) * 100}%`,
                      }}
                    />
                  </div>
                  <strong>
                    {Math.round((item.difficultyRate ?? 0) * 100)}%
                  </strong>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className={styles.chartCaption}>
          Estimated difficulty based on recorded exercise outcomes. Values are
          indicative and may differ between exercise types.
        </p>
      </section>

      <footer className={styles.pageFooter}>
        <span>First activity: {formatDateTime(overview.firstActivityAt)}</span>
        <span>Last activity: {formatDateTime(overview.lastActivityAt)}</span>
      </footer>
    </main>
  );
}
