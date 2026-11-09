
import { useEffect, useRef, useState } from "react";
import HanziWriter from "hanzi-writer";
import type {
  PracticeCharacterResult,
  WritingMistakeEvent,
} from "../types/writing";
import styles from "./CharacterCanvas.module.css";

interface PracticeCanvasProps {
  character: string;
  onCorrectStroke: () => void;
  onMistake: (event: WritingMistakeEvent) => void;
  onComplete: (totalMistakes: number) => void;
  onCompleteDetails?: (result: PracticeCharacterResult) => void;
}

export function PracticeCanvas({
  character,
  onCorrectStroke,
  onMistake,
  onComplete,
  onCompleteDetails,
}: PracticeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const correctStrokesRef = useRef(0);
  const totalStrokesRef = useRef(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    let isActive = true;

    correctStrokesRef.current = 0;
    totalStrokesRef.current = 0;

    setIsLoading(true);
    setError(null);
    container.replaceChildren();

    const writer = HanziWriter.create(container, character, {
      width: 280,
      height: 280,
      padding: 20,
      showCharacter: false,
      showOutline: true,
      outlineColor: "#dedbea",
      drawingColor: "#6558bf",
      highlightColor: "#d99450",
      strokeColor: "#6558bf",
      drawingWidth: 5,
      showHintAfterMisses: 3,

      onLoadCharDataSuccess: (data) => {
        if (!isActive) {
          return;
        }

        totalStrokesRef.current = data.strokes.length;
        setIsLoading(false);

        void writer.quiz({
          showHintAfterMisses: 3,

          onCorrectStroke: () => {
            if (!isActive) {
              return;
            }

            correctStrokesRef.current += 1;
            onCorrectStroke();
          },

          onMistake: (data) => {
            if (!isActive) {
              return;
            }

            onMistake({
              strokeNum: data.strokeNum,
              mistakesOnStroke: data.mistakesOnStroke,
              totalMistakes: data.totalMistakes,
            });
          },

          onComplete: (data) => {
            if (!isActive) {
              return;
            }

            onComplete(data.totalMistakes);

            onCompleteDetails?.({
              character: data.character,
              correctStrokes: correctStrokesRef.current,
              totalStrokes: totalStrokesRef.current,
              totalMistakes: data.totalMistakes,
            });
          },
        });
      },

      onLoadCharDataError: () => {
        if (!isActive) {
          return;
        }

        setIsLoading(false);
        setError(
          "Could not load character data. Check your internet connection.",
        );
      },
    });

    return () => {
      isActive = false;
      writer.cancelQuiz();
      container.replaceChildren();
    };
  }, [
    character,
    onCorrectStroke,
    onMistake,
    onComplete,
    onCompleteDetails,
  ]);

  return (
    <section className={styles.canvasSection}>
      <div className={styles.canvasContainer}>
        <div ref={containerRef} className={styles.canvas} />

        {isLoading && (
          <div className={styles.canvasOverlay}>
            <span>Preparing practice...</span>
          </div>
        )}

        {error && (
          <div className={styles.canvasOverlay}>
            <span>{error}</span>
          </div>
        )}
      </div>

      <p className={styles.practiceHint}>
        Follow the stroke direction and draw each stroke in the correct order.
      </p>
    </section>
  );
}
