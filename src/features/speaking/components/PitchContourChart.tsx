import type { PitchFrame } from "../utils/pitchDetection";
import styles from "./PitchContourChart.module.css";

interface PitchContourChartProps {
  frames: PitchFrame[];
  duration: number;
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;

const PADDING_LEFT = 48;
const PADDING_RIGHT = 16;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 34;

const MIN_ALLOWED_FREQUENCY = 50;
const MAX_ALLOWED_FREQUENCY = 600;
const MIN_DISPLAY_RANGE = 40;
const GRID_LINES = 5;
const MIN_CLARITY = 0.35;
const MAX_GAP_FRAMES = 3;

interface FrequencyRange {
  min: number;
  max: number;
}

function getFrequencyRange(frequencies: number[]): FrequencyRange {
  const min = Math.min(...frequencies);
  const max = Math.max(...frequencies);

  const center = (min + max) / 2;
  const actualRange = Math.max(max - min, MIN_DISPLAY_RANGE);
  const padding = actualRange * 0.25;

  return {
    min: Math.max(
      MIN_ALLOWED_FREQUENCY,
      Math.floor(center - actualRange / 2 - padding),
    ),
    max: Math.min(
      MAX_ALLOWED_FREQUENCY,
      Math.ceil(center + actualRange / 2 + padding),
    ),
  };
}

function getX(time: number, duration: number): number {
  const chartWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;

  return PADDING_LEFT + (time / duration) * chartWidth;
}

function getY(frequency: number, range: FrequencyRange): number {
  const chartHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const frequencyRange = range.max - range.min;

  if (frequencyRange <= 0) {
    return PADDING_TOP + chartHeight / 2;
  }

  return PADDING_TOP + ((range.max - frequency) / frequencyRange) * chartHeight;
}

function buildPathSegments(
  frames: PitchFrame[],
  duration: number,
  range: FrequencyRange,
): string[] {
  const segments: string[] = [];
  let currentSegment: string[] = [];
  let missingFrames = 0;

  frames.forEach((frame) => {
    const isValid =
      frame.frequency !== null &&
      Number.isFinite(frame.frequency) &&
      frame.clarity >= MIN_CLARITY;

    if (!isValid) {
      missingFrames += 1;

      if (missingFrames > MAX_GAP_FRAMES) {
        if (currentSegment.length > 1) {
          segments.push(currentSegment.join(" "));
        }

        currentSegment = [];
      }

      return;
    }

    const x = getX(frame.time, duration);
    const y = getY(frame.frequency!, range);

    currentSegment.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    missingFrames = 0;
  });

  if (currentSegment.length > 1) {
    segments.push(currentSegment.join(" "));
  }

  return segments;
}

export function PitchContourChart({
  frames,
  duration,
}: PitchContourChartProps) {
  const voicedFrames = frames.filter(
    (frame) =>
      frame.frequency !== null &&
      Number.isFinite(frame.frequency) &&
      frame.frequency > 0 &&
      frame.clarity >= MIN_CLARITY,
  );

  if (voicedFrames.length === 0 || duration <= 0) {
    return (
      <div className={styles.empty}>
        No reliable pitch information was detected in this recording.
      </div>
    );
  }

  const frequencies = voicedFrames.map((frame) => frame.frequency!);

  const frequencyRange = getFrequencyRange(frequencies);
  const pathSegments = buildPathSegments(frames, duration, frequencyRange);

  const minDetected = Math.min(...frequencies);
  const maxDetected = Math.max(...frequencies);

  const frequencyMarks = Array.from(
    { length: GRID_LINES },
    (_, index) =>
      frequencyRange.min +
      ((frequencyRange.max - frequencyRange.min) / (GRID_LINES - 1)) * index,
  );

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <div>
          <h4 className={styles.title}>Pitch contour</h4>
          <p className={styles.description}>
            Estimated fundamental frequency over time
          </p>
        </div>

        <span className={styles.unit}>Hz</span>
      </div>

      <div className={styles.chartWrapper}>
        <svg
          className={styles.chart}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-label="Pitch contour showing voice frequency over time"
        >
          {frequencyMarks.map((frequency) => {
            const y = getY(frequency, frequencyRange);

            return (
              <g key={frequency}>
                <line
                  x1={PADDING_LEFT}
                  y1={y}
                  x2={CHART_WIDTH - PADDING_RIGHT}
                  y2={y}
                  className={styles.gridLine}
                />

                <text
                  x={PADDING_LEFT - 9}
                  y={y + 4}
                  textAnchor="end"
                  className={styles.axisLabel}
                >
                  {Math.round(frequency)}
                </text>
              </g>
            );
          })}

          <line
            x1={PADDING_LEFT}
            y1={PADDING_TOP}
            x2={PADDING_LEFT}
            y2={CHART_HEIGHT - PADDING_BOTTOM}
            className={styles.axisLine}
          />

          <line
            x1={PADDING_LEFT}
            y1={CHART_HEIGHT - PADDING_BOTTOM}
            x2={CHART_WIDTH - PADDING_RIGHT}
            y2={CHART_HEIGHT - PADDING_BOTTOM}
            className={styles.axisLine}
          />

          {pathSegments.map((segment, index) => (
            <polyline
              key={index}
              points={segment}
              className={styles.pitchLine}
            />
          ))}

          <text
            x={PADDING_LEFT}
            y={CHART_HEIGHT - 9}
            textAnchor="middle"
            className={styles.axisLabel}
          >
            0s
          </text>

          <text
            x={CHART_WIDTH - PADDING_RIGHT}
            y={CHART_HEIGHT - 9}
            textAnchor="end"
            className={styles.axisLabel}
          >
            {duration.toFixed(1)}s
          </text>
        </svg>
      </div>

      <div className={styles.statistics}>
        <div className={styles.statistic}>
          <span className={styles.statisticLabel}>Lowest pitch</span>
          <strong>{Math.round(minDetected)} Hz</strong>
        </div>

        <div className={styles.statistic}>
          <span className={styles.statisticLabel}>Highest pitch</span>
          <strong>{Math.round(maxDetected)} Hz</strong>
        </div>

        <div className={styles.statistic}>
          <span className={styles.statisticLabel}>Analyzed frames</span>
          <strong>{voicedFrames.length}</strong>
        </div>
      </div>

      <p className={styles.note}>
        This chart shows estimated voice pitch. It does not yet determine
        whether a Mandarin tone was pronounced correctly.
      </p>
    </section>
  );
}
