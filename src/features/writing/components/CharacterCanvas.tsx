import { useEffect, useRef, useState } from "react";
import HanziWriter from "hanzi-writer";
import styles from "./CharacterCanvas.module.css";

interface CharacterCanvasProps {
  character: string;
}

export function CharacterCanvas({ character }: CharacterCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<ReturnType<typeof HanziWriter.create> | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsAnimating(false);

    container.replaceChildren();

    const writer = HanziWriter.create(container, character, {
      width: 280,
      height: 280,
      padding: 20,
      showCharacter: true,
      showOutline: true,
      strokeColor: "#6558bf",
      radicalColor: "#d99450",
      outlineColor: "#dedbea",
      drawingColor: "#6558bf",
      highlightColor: "#d99450",
      strokeAnimationSpeed: 1,
      onLoadCharDataSuccess: () => {
        setIsLoading(false);
      },
      onLoadCharDataError: () => {
        setIsLoading(false);
        setError(
          "Could not load character data. Check your internet connection.",
        );
      },
    });

    writerRef.current = writer;

    return () => {
      writer.cancelQuiz();
      writerRef.current = null;
      container.replaceChildren();
    };
  }, [character]);

  async function handleAnimate() {
    const writer = writerRef.current;

    if (!writer || isLoading || isAnimating) {
      return;
    }

    setIsAnimating(true);

    try {
      await writer.animateCharacter();
    } catch {
      setError("Character animation could not be completed.");
    } finally {
      setIsAnimating(false);
    }
  }

  return (
    <section className={styles.canvasSection}>
      <div className={styles.canvasContainer}>
        <div ref={containerRef} className={styles.canvas} />

        {isLoading && (
          <div className={styles.canvasOverlay}>
            <span>Loading character...</span>
          </div>
        )}

        {error && (
          <div className={styles.canvasOverlay}>
            <span>{error}</span>
          </div>
        )}
      </div>

      <button
        className={styles.animateButton}
        type="button"
        onClick={handleAnimate}
        disabled={isLoading || isAnimating || Boolean(error)}
      >
        {isAnimating ? "Playing animation..." : "Show stroke order"}
      </button>
    </section>
  );
}
