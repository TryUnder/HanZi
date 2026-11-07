import { Mic, RotateCcw, Square } from "lucide-react";
import { useMicrophone } from "../hooks/useMicrophone";
import { usePitchAnalysis } from "../hooks/usePitchAnalysis";
import type { MandarinTone } from "../types/speaking";
import type { ChineseCharacter } from "../../library/types/character";
import { PitchContourChart } from "./PitchContourChart";
import { PronunciationPlayer } from "./PronunciationPlayer";
import styles from "./SpeakingRecorder.module.css";

interface SpeakingRecorderProps {
  characters: ChineseCharacter[];
  character: ChineseCharacter;
  onCharacterChange: (characterId: string) => void;
}

const TONE_NAMES: Record<MandarinTone, string> = {
  1: "High and level",
  2: "Rising",
  3: "Low and dipping",
  4: "Falling",
  5: "Neutral",
};

export function SpeakingRecorder({
  characters,
  character,
  onCharacterChange,
}: SpeakingRecorderProps) {
  const {
    isRecording,
    audioUrl,
    error: recordingError,
    startRecording,
    stopRecording,
    clearRecording,
  } = useMicrophone();

  const {
    frames,
    duration,
    assessment,
    isAnalyzing,
    error: analysisError,
    analyze,
    reset,
  } = usePitchAnalysis();

  function handleStartRecording() {
    reset();
    void startRecording();
  }

  function handleClearRecording() {
    clearRecording();
    reset();
  }

  const toneMatches =
    assessment?.status === "matched" &&
    assessment.matchedTone === character.tone;

  const toneDiffers =
    assessment?.status === "matched" &&
    assessment.matchedTone !== character.tone;

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>SPEAKING PRACTICE</span>
          <h3 className={styles.title}>Practice your pronunciation</h3>
          <p className={styles.description}>
            Choose a character, listen to its pronunciation, record your voice,
            and compare your tone.
          </p>
        </div>
      </div>

      <div className={styles.characterSelection}>
        <label className={styles.selectLabel} htmlFor="speaking-character">
          Choose a character
        </label>

        <select
          id="speaking-character"
          className={styles.characterSelect}
          value={character.id}
          onChange={(event) => onCharacterChange(event.target.value)}
          disabled={isRecording || isAnalyzing}
        >
          {characters.map((item) => (
            <option key={item.id} value={item.id}>
              {item.simplified} — {item.pinyin} ({item.meaning})
            </option>
          ))}
        </select>

        <div className={styles.target}>
          <div className={styles.targetCharacter}>{character.simplified}</div>

          <div className={styles.targetInfo}>
            <h4 className={styles.targetPinyin}>{character.pinyin}</h4>
            <p className={styles.targetMeaning}>{character.meaning}</p>
            <span className={styles.targetTone}>
              Expected tone: {character.tone} – {TONE_NAMES[character.tone]}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.reference}>
        <div>
          <strong>Reference pronunciation</strong>
          <p>Listen to the correct pronunciation before recording.</p>
        </div>

        <PronunciationPlayer
          audioUrl={character.audioUrl ?? null}
          text={character.simplified}
          label={character.simplified}
        />
      </div>

      <div className={styles.recorder}>
        <div
          className={`${styles.microphone} ${
            isRecording ? styles.microphoneActive : ""
          }`}
        >
          <Mic size={30} />
        </div>

        <p className={styles.status} aria-live="polite">
          {isRecording
            ? "Recording in progress..."
            : audioUrl
              ? "Recording completed"
              : "Ready to record"}
        </p>

        <p className={styles.hint}>
          {isRecording
            ? "Speak now. Press stop when you finish."
            : "Try to reproduce the reference pronunciation."}
        </p>

        <div className={styles.controls}>
          {!isRecording ? (
            <button
              type="button"
              className={styles.recordButton}
              onClick={handleStartRecording}
            >
              <Mic size={18} />
              {audioUrl ? "Record again" : "Start recording"}
            </button>
          ) : (
            <button
              type="button"
              className={styles.stopButton}
              onClick={stopRecording}
            >
              <Square size={17} />
              Stop recording
            </button>
          )}

          {audioUrl && !isRecording && (
            <button
              type="button"
              className={styles.resetButton}
              onClick={handleClearRecording}
              aria-label="Delete recording"
            >
              <RotateCcw size={17} />
              Clear
            </button>
          )}
        </div>

        {audioUrl && !isRecording && (
          <div className={styles.playback}>
            <span className={styles.playbackLabel}>Your recording</span>

            <audio
              className={styles.audioPlayer}
              controls
              src={audioUrl}
              preload="metadata"
            />

            <button
              type="button"
              className={styles.recordButton}
              onClick={() => void analyze(audioUrl)}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? "Analyzing audio..." : "Analyze pronunciation"}
            </button>
          </div>
        )}

        {recordingError && (
          <p className={styles.error} role="alert">
            {recordingError}
          </p>
        )}

        {analysisError && (
          <p className={styles.error} role="alert">
            {analysisError}
          </p>
        )}

        {assessment && (
          <div className={styles.assessment} aria-live="polite">
            <div className={styles.assessmentHeader}>
              <h4 className={styles.assessmentTitle}>Tone analysis</h4>

              {assessment.status === "matched" && (
                <span className={styles.assessmentScore}>
                  {assessment.confidence}% similarity
                </span>
              )}
            </div>

            {assessment.status === "matched" && assessment.matchedTone && (
              <>
                <p className={styles.assessmentMessage}>
                  Detected tone:{" "}
                  <strong>
                    Tone {assessment.matchedTone} –{" "}
                    {TONE_NAMES[assessment.matchedTone]}
                  </strong>
                </p>

                <div className={styles.toneComparison}>
                  {toneMatches ? (
                    <strong>
                      Your detected tone matches the expected tone.
                    </strong>
                  ) : toneDiffers ? (
                    <strong>
                      The detected tone differs from the expected tone (
                      {character.tone}).
                    </strong>
                  ) : null}
                </div>

                <p className={styles.assessmentHint}>
                  This is a preliminary contour-based result, not a complete
                  pronunciation assessment.
                </p>
              </>
            )}

            {assessment.status === "ambiguous" && (
              <>
                <p className={styles.assessmentMessage}>
                  The tone could not be identified confidently.
                </p>

                <div className={styles.candidateList}>
                  {assessment.candidates.map((candidate) => (
                    <span className={styles.candidate} key={candidate.tone}>
                      Tone {candidate.tone} – {TONE_NAMES[candidate.tone]}
                    </span>
                  ))}
                </div>
              </>
            )}

            {assessment.status === "uncertain" && (
              <p className={styles.assessmentMessage}>
                Your pitch contour does not closely match any of the tone
                templates. Try speaking more clearly and consistently.
              </p>
            )}

            {assessment.status === "insufficient-data" && (
              <p className={styles.assessmentMessage}>
                Not enough clear voice data. Try recording a longer
                pronunciation with less background noise.
              </p>
            )}
          </div>
        )}

        {frames.length > 0 && (
          <PitchContourChart frames={frames} duration={duration} />
        )}
      </div>
    </section>
  );
}
