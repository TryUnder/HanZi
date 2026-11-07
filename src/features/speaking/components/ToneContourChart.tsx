import type { ToneDefinition } from "../types/speaking";
import styles from "./ToneContourChart.module.css";

interface ToneContourChartProps {
  definition: ToneDefinition;
}

const VIEWBOX_WIDTH = 320;
const VIEWBOX_HEIGHT = 150;
const HORIZONTAL_PADDING = 24;
const VERTICAL_PADDING = 20;

function getContourPoints(contour: readonly number[]): string {
  if (contour.length === 0) {
    return "";
  }

  const availableWidth = VIEWBOX_WIDTH - HORIZONTAL_PADDING * 2;
  const availableHeight = VIEWBOX_HEIGHT - VERTICAL_PADDING * 2;

  return contour
    .map((pitch, index) => {
      const x =
        HORIZONTAL_PADDING +
        (index / Math.max(contour.length - 1, 1)) * availableWidth;

      const y =
        VIEWBOX_HEIGHT - VERTICAL_PADDING - ((pitch - 1) / 4) * availableHeight;

      return `${x},${y}`;
    })
    .join(" ");
}

export function ToneContourChart({ definition }: ToneContourChartProps) {
  const points = getContourPoints(definition.contour);

  return (
    <div className={styles.container}>
      <div className={styles.axisLabels} aria-hidden="true">
        <span>High</span>
        <span>Mid</span>
        <span>Low</span>
      </div>

      <svg
        className={styles.chart}
        viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        role="img"
        aria-label={`Pitch contour for the ${definition.name}`}
      >
        {[1, 2, 3, 4, 5].map((level) => {
          const y =
            VIEWBOX_HEIGHT -
            VERTICAL_PADDING -
            ((level - 1) / 4) * (VIEWBOX_HEIGHT - VERTICAL_PADDING * 2);

          return (
            <line
              key={level}
              x1={HORIZONTAL_PADDING}
              x2={VIEWBOX_WIDTH - HORIZONTAL_PADDING}
              y1={y}
              y2={y}
              className={styles.gridLine}
            />
          );
        })}

        <polyline
          points={points}
          className={styles.contour}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.split(" ").map((point, index) => {
          const [cx, cy] = point.split(",");

          return (
            <circle
              key={index}
              cx={cx}
              cy={cy}
              r="4"
              className={styles.point}
            />
          );
        })}
      </svg>
    </div>
  );
}
