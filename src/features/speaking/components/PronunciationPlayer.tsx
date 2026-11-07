import { Pause, Play } from "lucide-react";
import type { PronunciationExample } from "../types/speaking";
import { usePronunciation } from "../hooks/usePronunciation";
import styles from "./PronunciationPlayer.module.css";

interface PronunciationPlayerProps {
  example: PronunciationExample;
}

export function PronunciationPlayer({ example }: PronunciationPlayerProps) {
  const { audioRef, isPlaying, error, play } = usePronunciation({
    audioUrl: example.audioUrl,
    text: example.character,
  });

  return (
    <div className={styles.container}>
      {example.audioUrl && (
        <audio
          ref={audioRef}
          src={example.audioUrl}
          preload="none"
          onPlay={() => {}}
          onPause={() => {}}
          onEnded={() => {}}
          onError={() => {}}
        />
      )}

      <button
        type="button"
        className={styles.playButton}
        onClick={() => void play()}
        aria-label={
          isPlaying
            ? `Pause pronunciation of ${example.pinyin}`
            : `Play pronunciation of ${example.pinyin}`
        }
        title={isPlaying ? "Pause pronunciation" : "Play pronunciation"}
      >
        {isPlaying ? <Pause size={17} /> : <Play size={17} />}
      </button>

      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
