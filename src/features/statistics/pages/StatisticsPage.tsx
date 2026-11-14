
import { useId } from "react";

import {
  Activity,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  CircleHelp,
  Eye,
  Layers,
  PenLine,
  RefreshCw,
  Target,
} from "lucide-react";

import { resolveExerciseBreakdown } from "../application/resolvers/resolveExerciseBreakdown";
import type { ExerciseItemStatistics } from "../domain/types/statistics";
import { useLearningStatistics } from "../hooks/useLearningStatistics";

import styles from "./StatisticsPage.module.css";

const exerciseSections = [
  {
    exerciseType: "vocabulary-recognition",
    title: "Vocabulary recognition",
    description: "Words that are difficult to recognise",
    detail: "Answer accuracy",
    icon: Eye,
    accent: "recognition",
  },
  {
    exerciseType: "writing-practice",
    title: "Guided writing",
    description: "Words that need more writing practice",
    detail: "Stroke accuracy",
    icon: PenLine,
    accent: "guided",
  },
  {
    exerciseType: "memory-writing",
    title: "Writing from memory",
    description: "Words that are difficult to recall and write",
    detail: "Stroke accuracy",
    icon: Target,
    accent: "memory",
  },
] as const;

const MAX_ACTIVITY_WEEKS = 52;

interface StatisticHelpProps {
  readonly label: string;
  readonly description: string;
}

interface DailyActivityPoint {
  readonly date: string;
  readonly attemptCount: number;
}

interface ActivityDay {
  readonly date: string;
  readonly attemptCount: number;
  readonly level: number;
}

interface ActivityWeek {
  readonly key: string;
  readonly monthLabel: string;
  readonly days: readonly (ActivityDay | null)[];
}

function StatisticHelp({ label, description }: StatisticHelpProps) {
  const tooltipId = useId();

  return (
    <span className={styles.helpWrapper}>
      <button
        type="button"
        className={styles.helpButton}
        aria-label={`What does ${label} mean?`}
        aria-describedby={tooltipId}
      >
        <CircleHelp size={14} aria-hidden="true" />
      </button>

      <span
        className={styles.helpTooltip}
        id={tooltipId}
        role="tooltip"
      >
        <strong>{label}</strong>
        {description}
      </span>
    </span>
  );
}

function getAccuracyHelp(
  exerciseType: string,
  detail: string,
): string {
  if (exerciseType === "vocabulary-recognition") {
    return `${detail} is the percentage of correct answers among all submitted recognition answers. For example, 80% means 8 out of 10 answers were correct.`;
  }

  return `${detail} is the percentage of correctly evaluated strokes among all evaluated strokes. For example, 80% means 8 out of 10 strokes were correct. This measures stroke performance, not the percentage of perfectly completed words.`;
}

function getActivityLevel(
  attemptCount: number,
  maxAttempts: number,
): number {
  if (attemptCount === 0) {
    return 0;
  }

  const ratio = attemptCount / maxAttempts;

  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;

  return 4;
}

function getMonday(date: Date): Date {
  const monday = new Date(date);
  const mondayOffset = (monday.getUTCDay() + 6) % 7;

  monday.setUTCDate(monday.getUTCDate() - mondayOffset);
  monday.setUTCHours(0, 0, 0, 0);

  return monday;
}

function buildActivityWeeks(
  dailyActivity: readonly DailyActivityPoint[],
): readonly ActivityWeek[] {
  if (dailyActivity.length === 0) {
    return [];
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const todayKey = today.toISOString().slice(0, 10);

  const sortedActivity = [...dailyActivity]
    .filter((day) => day.date <= todayKey)
    .sort((a, b) => a.date.localeCompare(b.date));

  const firstActivity = sortedActivity.at(0);

  if (!firstActivity) {
    return [];
  }

  const firstActivityDate = new Date(
    `${firstActivity.date}T00:00:00Z`,
  );

  const currentWeekStart = getMonday(today);

  const rollingStartDate = new Date(currentWeekStart);
  rollingStartDate.setUTCDate(
    rollingStartDate.getUTCDate() - (MAX_ACTIVITY_WEEKS - 1) * 7,
  );

  const firstActivityWeekStart = getMonday(firstActivityDate);

  const startDate =
    firstActivityWeekStart > rollingStartDate
      ? firstActivityWeekStart
      : rollingStartDate;

  const startDateKey = startDate.toISOString().slice(0, 10);

  const visibleActivity = sortedActivity.filter(
    (day) => day.date >= startDateKey,
  );

  const attemptsByDate = new Map(
    visibleActivity.map((day) => [day.date, day.attemptCount]),
  );

  const maxAttempts = Math.max(
    1,
    ...visibleActivity.map((day) => day.attemptCount),
  );

  const weeks: ActivityWeek[] = [];
  const cursor = new Date(startDate);

  while (cursor <= today) {
    const weekDays: (ActivityDay | null)[] = [];
    let monthLabel = "";

    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const dateKey = cursor.toISOString().slice(0, 10);

      const isWithinRange =
        cursor >= firstActivityDate && cursor <= today;

      if (isWithinRange) {
        const attemptCount = attemptsByDate.get(dateKey) ?? 0;

        weekDays.push({
          date: dateKey,
          attemptCount,
          level: getActivityLevel(attemptCount, maxAttempts),
        });

        if (
          monthLabel === "" &&
          (cursor.getUTCDate() === 1 || weeks.length === 0)
        ) {
          monthLabel = new Intl.DateTimeFormat("en", {
            month: "short",
            timeZone: "UTC",
          }).format(cursor);
        }
      } else {
        weekDays.push(null);
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    weeks.push({
      key: dateKeyFromWeek(weekDays),
      monthLabel,
      days: weekDays,
    });
  }

  return weeks;
}

function dateKeyFromWeek(
  days: readonly (ActivityDay | null)[],
): string {
  return days.find((day) => day !== null)?.date ?? "empty-week";
}

function formatActivityDate(date: string): string {
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
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

function formatHskLevels(levels: readonly number[]): string {
  return levels.map((level) => `HSK ${level}`).join(" · ");
}

function getExerciseDescription(
  exercise: ExerciseItemStatistics,
): string {
  switch (exercise.exerciseType) {
    case "vocabulary-recognition":
      return `${exercise.correctCount} correct · ${exercise.incorrectCount} incorrect`;

    case "writing-practice":
    case "memory-writing":
      return `${exercise.perfectAttemptCount} perfect · ${exercise.correctStrokes}/${exercise.totalStrokes} strokes`;
  }
}

function getExerciseAccuracy(
  exercise: ExerciseItemStatistics,
): number | null {
  switch (exercise.exerciseType) {
    case "vocabulary-recognition":
      return exercise.accuracyRate;

    case "writing-practice":
    case "memory-writing":
      return exercise.strokeAccuracyRate;
  }
}

function getDifficultyLabel(rate: number): string {
  if (rate >= 0.7) {
    return "Needs attention";
  }

  if (rate >= 0.4) {
    return "Worth practising";
  }

  return "Making progress";
}

function getDifficultyLevel(rate: number): string {
  if (rate >= 0.7) {
    return "high";
  }

  if (rate >= 0.4) {
    return "medium";
  }

  return "low";
}

function getCharacterCount(
  simplified: string,
  traditional: string | null,
): number {
  return Math.max(
    Array.from(simplified).length,
    traditional ? Array.from(traditional).length : 0,
  );
}

function getCharacterTileWidth(characterCount: number): number {
  return Math.min(132, Math.max(64, 40 + characterCount * 13));
}

function getCharacterFontSize(characterCount: number): number {
  if (characterCount <= 2) return 29;
  if (characterCount <= 4) return 24;
  if (characterCount <= 6) return 20;

  return 17;
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

  const { overview, items, dailyActivity } = statistics;

  const exerciseBreakdown = resolveExerciseBreakdown(items);

  const totalExerciseAttempts = exerciseBreakdown.reduce(
    (total, exercise) => total + exercise.attemptCount,
    0,
  );

  const activityWeeks = buildActivityWeeks(dailyActivity);

  const difficultExercises = items
    .flatMap((item) =>
      item.exerciseStatistics.flatMap((exercise) => {
        if (exercise.difficultyRate === null) {
          return [];
        }

        return [
          {
            item,
            exercise,
            difficultyRate: exercise.difficultyRate,
          },
        ];
      }),
    )
    .sort(
      (a, b) =>
        b.difficultyRate - a.difficultyRate ||
        b.exercise.attemptCount - a.exercise.attemptCount,
    );

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headingGroup}>
          <span className={styles.eyebrow}>YOUR LEARNING JOURNEY</span>
          <h1>Statistics</h1>
          <p>
            Understand your progress, recognise patterns and decide what to
            practise next.
          </p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => void refreshStatistics()}
          disabled={isLoading}
        >
          <RefreshCw
            size={16}
            className={isLoading ? styles.spinning : ""}
          />
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
          <span className={styles.metricHint}>
            Recorded exercise attempts
          </span>
        </article>

        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.green}`}>
            <BookOpen size={19} />
          </div>
          <span className={styles.metricLabel}>ITEMS STUDIED</span>
          <strong className={styles.metricValue}>
            {overview.distinctItemCount.toLocaleString()}
          </strong>
          <span className={styles.metricHint}>
            Characters and vocabulary
          </span>
        </article>

        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.orange}`}>
            <CalendarDays size={19} />
          </div>
          <span className={styles.metricLabel}>TRACKED SESSIONS</span>
          <strong className={styles.metricValue}>
            {overview.trackedSessionCount.toLocaleString()}
          </strong>
          <span className={styles.metricHint}>
            Sessions with recorded activity
          </span>
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
        <article className={`${styles.panel} ${styles.activityPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>CONSISTENCY</span>
              <h2>Learning activity</h2>
              <p className={styles.panelSubtitle}>
                Your daily learning rhythm. More filled squares mean more
                exercise attempts.
              </p>
            </div>
            <Activity size={19} className={styles.panelIcon} />
          </div>

          {activityWeeks.length === 0 ? (
            <div className={styles.emptyState}>
              No exercise activity has been recorded yet.
            </div>
          ) : (
            <div className={styles.heatmapContainer}>
  <div className={styles.heatmapScroll}>
    <div className={styles.heatmap}>
      <div className={styles.weekdayLabels} aria-hidden="true">
        <span>Mon</span>
        <span />
        <span>Wed</span>
        <span />
        <span>Fri</span>
        <span />
        <span>Sun</span>
      </div>

      <div className={styles.heatmapContent}>
        <div
          className={styles.monthLabels}
          style={{
            gridTemplateColumns: `repeat(${activityWeeks.length}, var(--heatmap-week-width))`,
          }}
          aria-hidden="true"
        >
          {activityWeeks.map((week) => (
            <span key={week.key}>{week.monthLabel}</span>
          ))}
        </div>

        <div
          className={styles.activityWeeks}
          style={{
            gridTemplateColumns: `repeat(${activityWeeks.length}, var(--heatmap-week-width))`,
          }}
        >
          {activityWeeks.map((week, weekIndex) => (
            <div className={styles.activityWeek} key={week.key}>
              {week.days.map((day, dayIndex) =>
                day ? (
                  <span
                    className={styles.activityDay}
                    data-level={day.level}
                    data-tooltip={`${formatActivityDate(day.date)} · ${day.attemptCount} exercise ${day.attemptCount === 1 ? "attempt" : "attempts"}`}
                    data-tooltip-align={
                      weekIndex < 3
                        ? "start"
                        : weekIndex >= activityWeeks.length - 3
                          ? "end"
                          : "center"
                    }
                    tabIndex={0}
                    key={day.date}
                    aria-label={`${formatActivityDate(day.date)}: ${day.attemptCount} exercise ${day.attemptCount === 1 ? "attempt" : "attempts"}`}
                  />
                ) : (
                  <span
                    className={styles.activityDayPlaceholder}
                    key={`empty-${week.key}-${dayIndex}`}
                    aria-hidden="true"
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>

  <div className={styles.heatmapFooter}>
    <span className={styles.heatmapSummary}>
      {dailyActivity
        .reduce((total, day) => total + day.attemptCount, 0)
        .toLocaleString()}{" "}
      attempts recorded
    </span>

    <div className={styles.heatmapLegend}>
      <span>Less</span>
      {[0, 1, 2, 3, 4].map((level) => (
        <span
          className={styles.legendSquare}
          data-level={level}
          key={level}
        />
      ))}
      <span>More</span>
    </div>
  </div>
</div>
          )}
        </article>

        <article className={`${styles.panel} ${styles.breakdownPanel}`}>
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.panelEyebrow}>BREAKDOWN</span>
              <h2>Exercise types</h2>
              <p className={styles.panelSubtitle}>
                Compare how often you practise and how accurately you perform.
              </p>
            </div>
            <ChartNoAxesCombined
              size={19}
              className={styles.panelIcon}
            />
          </div>

          <div className={styles.activityList}>
            {exerciseBreakdown.map((exercise) => {
              const share =
                totalExerciseAttempts > 0
                  ? (exercise.attemptCount / totalExerciseAttempts) * 100
                  : 0;

              return (
                <div
                  className={styles.activityItem}
                  key={exercise.exerciseType}
                >
                  <div className={styles.activityHeading}>
                    <div className={styles.activityTitle}>
                      <strong>{exercise.title}</strong>
                      <span>{exercise.description}</span>
                    </div>
                  </div>

                  <div className={styles.activityMetrics}>
                    <div className={styles.activityMetric}>
                      <div className={styles.metricLabelWithHelp}>
                        <span>Attempts</span>
                        <StatisticHelp
                          label="Attempts"
                          description="The total number of recorded attempts for this exercise type. A higher number means you have practised this activity more often, not necessarily that you performed better."
                        />
                      </div>
                      <strong className={styles.activityMetricValue}>
                        {exercise.attemptCount.toLocaleString()}
                      </strong>
                    </div>

                    <div className={styles.activityMetric}>
                      <div className={styles.metricLabelWithHelp}>
                        <span>Accuracy</span>
                        <StatisticHelp
                          label="Accuracy"
                          description={
                            exercise.accuracyRate === null
                              ? "There are not enough measurable results yet to calculate accuracy. Complete this exercise to see your result."
                              : getAccuracyHelp(
                                  exercise.exerciseType,
                                  exercise.detail.toLowerCase(),
                                )
                          }
                        />
                      </div>
                      <strong className={styles.activityMetricValue}>
                        {exercise.accuracyRate === null
                          ? "—"
                          : `${Math.round(exercise.accuracyRate * 100)}%`}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.shareSection}>
                    <div className={styles.shareHeader}>
                      <div className={styles.metricLabelWithHelp}>
                        <span>Practice share</span>
                        <StatisticHelp
                          label="Practice share"
                          description="Shows what percentage of all recorded attempts belongs to this exercise type. It describes how your practice is distributed, not how accurately you perform."
                        />
                      </div>
                      <strong>{Math.round(share)}%</strong>
                    </div>

                    <div
                      className={styles.progressTrack}
                      role="progressbar"
                      aria-label={`${exercise.title} share of exercise attempts`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(share)}
                    >
                      <div
                        className={styles.progressFill}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <section className={`${styles.panel} ${styles.focusPanel}`}>
        <div className={styles.focusHeading}>
          <div>
            <span className={styles.panelEyebrow}>
              PERSONAL PRACTICE PLAN
            </span>
            <h2>What needs more practice?</h2>
            <p className={styles.panelSubtitle}>
              Your most challenging vocabulary, ranked independently for each
              exercise type.
            </p>
          </div>

          <div className={styles.focusHeaderIcon}>
            <Target size={21} />
          </div>
        </div>

        <div className={styles.rankingLegend}>
          <span>
            <span className={`${styles.legendDot} ${styles.highDot}`} />
            High difficulty
          </span>

          <span>
            <span className={`${styles.legendDot} ${styles.mediumDot}`} />
            Moderate
          </span>

          <span>
            <span className={`${styles.legendDot} ${styles.lowDot}`} />
            Improving
          </span>

          <span className={styles.rankingLimit}>
            TOP 8 PER CATEGORY
          </span>
        </div>

        <div className={styles.exerciseSections}>
          {exerciseSections.map((section) => {
            const SectionIcon = section.icon;

            const sectionItems = difficultExercises
              .filter(
                ({ exercise }) =>
                  exercise.exerciseType === section.exerciseType,
              )
              .slice(0, 8);

            return (
              <section
                className={`${styles.exerciseSection} ${styles[section.accent]}`}
                key={section.exerciseType}
                aria-label={section.title}
              >
                <header className={styles.exerciseSectionHeader}>
                  <div className={styles.sectionIcon}>
                    <SectionIcon size={19} />
                  </div>

                  <div className={styles.sectionHeadingText}>
                    <h3>{section.title}</h3>
                    <p>{section.description}</p>
                  </div>

                  <span className={styles.sectionCount}>
                    {sectionItems.length}/8
                  </span>
                </header>

                {sectionItems.length === 0 ? (
                  <div className={styles.sectionEmpty}>
                    <SectionIcon size={23} />
                    <strong>No data yet</strong>
                    <span>
                      Complete this exercise to build your ranking.
                    </span>
                  </div>
                ) : (
                  <ol className={styles.rankingList}>
                    {sectionItems.map(
                      ({ item, exercise, difficultyRate }, index) => {
                        const display = item.display;
                        const accuracy = getExerciseAccuracy(exercise);
                        const difficultyLevel =
                          getDifficultyLevel(difficultyRate);

                        const characterCount = getCharacterCount(
                          display.simplified,
                          display.traditional,
                        );

                        const characterTileWidth =
                          getCharacterTileWidth(characterCount);

                        const characterFontSize =
                          getCharacterFontSize(characterCount);

                        return (
                          <li
                            className={styles.rankingItem}
                            key={`${item.item.kind}:${item.item.id}:${exercise.exerciseType}`}
                          >
                            <span className={styles.rankNumber}>
                              {String(index + 1).padStart(2, "0")}
                            </span>

                            <div
                              className={styles.characterTile}
                              style={{
                                width: `${characterTileWidth}px`,
                              }}
                            >
                              <strong
                                lang="zh"
                                style={{
                                  fontSize: `${characterFontSize}px`,
                                }}
                              >
                                {display.simplified}
                              </strong>

                              {display.traditional &&
                                display.traditional !==
                                  display.simplified && (
                                  <span>{display.traditional}</span>
                                )}
                            </div>

                            <div className={styles.rankingContent}>
                              <div className={styles.wordHeading}>
                                <span className={styles.wordPinyin}>
                                  {display.pinyin || "—"}
                                </span>

                                {display.hskLevels.length > 0 && (
                                  <span className={styles.wordHsk}>
                                    {formatHskLevels(display.hskLevels)}
                                  </span>
                                )}
                              </div>

                              <span className={styles.wordMeaning}>
                                {display.meaning || "Meaning unavailable"}
                              </span>

                              {!display.isResolved && (
                                <span className={styles.unresolvedNotice}>
                                  Library entry not found
                                </span>
                              )}

                              <div className={styles.wordStats}>
                                <span>
                                  <strong>{exercise.attemptCount}</strong>{" "}
                                  attempts
                                </span>

                                <span>
                                  <strong>
                                    {accuracy === null
                                      ? "—"
                                      : `${Math.round(accuracy * 100)}%`}
                                  </strong>{" "}
                                  {section.detail.toLowerCase()}
                                </span>
                              </div>

                              <div className={styles.difficultyTrack}>
                                <div
                                  className={`${styles.difficultyFill} ${
                                    styles[difficultyLevel]
                                  }`}
                                  style={{
                                    width: `${difficultyRate * 100}%`,
                                  }}
                                />
                              </div>

                              <div className={styles.wordFooter}>
                                <span className={styles.difficultyLabel}>
                                  {getDifficultyLabel(difficultyRate)}
                                </span>

                                <time dateTime={exercise.lastAttemptAt}>
                                  {formatDateTime(exercise.lastAttemptAt)}
                                </time>
                              </div>

                              <span className={styles.exerciseBreakdown}>
                                {getExerciseDescription(exercise)}
                              </span>
                            </div>
                          </li>
                        );
                      },
                    )}
                  </ol>
                )}
              </section>
            );
          })}
        </div>

        <p className={styles.chartCaption}>
          Each ranking uses only its own exercise results. Recognition is based
          on answer accuracy; writing exercises are based on stroke accuracy.
        </p>
      </section>

      <footer className={styles.pageFooter}>
        <span>
          First activity: {formatDateTime(overview.firstActivityAt)}
        </span>
        <span>
          Last activity: {formatDateTime(overview.lastActivityAt)}
        </span>
      </footer>
    </main>
  );
}
