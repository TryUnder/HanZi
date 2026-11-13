import { Pause, Play } from "lucide-react";
import { resolveAudioUrl } from "../../../shared/infrastructure/audio/resolveAudioUrl";
import { usePronunciation } from "../hooks/usePronunciation";
import styles from "./PronunciationPlayer.module.css";

interface PronunciationPlayerProps {
  audioUrl: string | null;
  text: string;
  label: string;
}

export function PronunciationPlayer({
  audioUrl,
  text,
  label,
}: PronunciationPlayerProps) {
  const resolvedAudioUrl = resolveAudioUrl(audioUrl);

  const { audioRef, isPlaying, error, play } = usePronunciation({
    audioUrl: resolvedAudioUrl,
    text,
  });

  return (
    <div className={styles.container}>
      <audio
        ref={audioRef}
        src={resolvedAudioUrl ?? undefined}
        preload="none"
      />

      <button
        type="button"
        className={styles.playButton}
        onClick={() => void play()}
        aria-label={isPlaying ? `Pause ${label}` : `Play ${label}`}
        title={isPlaying ? "Pause pronunciation" : "Play pronunciation"}
      >
        {isPlaying ? <Pause size={17} /> : <Play size={17} />}
      </button>

      {error && <span className={styles.error}>{error}</span>}
    </div>
  );
}
