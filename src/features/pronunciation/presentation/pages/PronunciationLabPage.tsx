
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  Activity,
  AudioLines,
  CheckCircle2,
  CircleAlert,
  Clipboard,
  FileAudio,
  LoaderCircle,
  Mic,
  MicOff,
  RotateCcw,
  Upload,
} from "lucide-react";

import {
  analyzeWordPronunciation,
} from "../../application/services/pronunciationAnalysisService";
import type {
  PronunciationAnalysisResponse,
  PronunciationAnalysisResult,
} from "../../application/services/pronunciationAnalysisService";
import type {
  SyllablePitchContour,
} from "../../domain/models/syllablePitchContour";

import { usePronunciationRecorder } from "../hooks/usePronunciationRecorder";
import styles from "./PronunciationLabPage.module.css";

const INITIAL_WORD = "你好";
const INITIAL_PINYIN = "ni3 hao3";

function getToneName(tone: number): string {
  const names: Record<number, string> = {
    1: "Pierwszy — równy",
    2: "Drugi — rosnący",
    3: "Trzeci — opadająco-rosnący",
    4: "Czwarty — opadający",
    5: "Neutralny",
  };

  return names[tone] ?? `Ton ${tone}`;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    accepted: "Dopasowanie zaakceptowane",
    rejected: "Dopasowanie odrzucone",
    "low-confidence": "Niska pewność",
    "insufficient-data": "Za mało danych",
    matched: "Dobry kontur",
    "needs-improvement": "Do poprawy",
    uncertain: "Niepewny wynik",
    "limited-assessment": "Ograniczona ocena",
    analyzed: "Przeanalizowano",
    "alignment-rejected": "Dopasowanie odrzucone",
    "alignment-low-confidence": "Niska pewność dopasowania",
    "alignment-insufficient-data": "Za mało danych do dopasowania",
  };

  return labels[status] ?? status;
}

function formatSeconds(value: number): string {
  return `${value.toFixed(2)} s`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function getErrorMessage(
  response: Extract<PronunciationAnalysisResponse, { success: false }>,
): string {
  return `${response.error.stage} / ${response.error.code}: ${response.error.message}`;
}

function PitchChart({
  contours,
  durationSeconds,
}: {
  readonly contours: readonly SyllablePitchContour[];
  readonly durationSeconds: number;
}) {
  const width = 900;
  const height = 280;
  const left = 48;
  const right = 20;
  const top = 20;
  const bottom = 42;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const points = contours.flatMap((contour) => contour.points);

  if (points.length === 0) {
    return (
      <div className={styles.emptyChart}>
        Brak wystarczających danych F0 do narysowania wykresu.
      </div>
    );
  }

  const minimum = Math.min(
    -6,
    ...points.map((point) => point.semitonesFromReference),
  );

  const maximum = Math.max(
    6,
    ...points.map((point) => point.semitonesFromReference),
  );

  const range = Math.max(maximum - minimum, 1);
  const paddedMinimum = minimum - range * 0.1;
  const paddedMaximum = maximum + range * 0.1;
  const paddedRange = paddedMaximum - paddedMinimum;

  const x = (timeSeconds: number) =>
    left + (timeSeconds / durationSeconds) * chartWidth;

  const y = (semitones: number) =>
    top +
    ((paddedMaximum - semitones) / paddedRange) * chartHeight;

  const gridValues = [paddedMinimum, 0, paddedMaximum];

  return (
    <div className={styles.chartContainer}>
      <svg
        className={styles.pitchChart}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Wykres konturu częstotliwości podstawowej F0"
      >
        {gridValues.map((value) => (
          <g key={value}>
            <line
              x1={left}
              x2={width - right}
              y1={y(value)}
              y2={y(value)}
              className={styles.gridLine}
            />
            <text
              x={left - 9}
              y={y(value) + 4}
              textAnchor="end"
              className={styles.axisLabel}
            >
              {value.toFixed(1)}
            </text>
          </g>
        ))}

        {contours.map((contour) => {
          const startX = x(contour.startSeconds);
          const endX = x(contour.endSeconds);

          return (
            <g key={contour.syllableIndex}>
              <line
                x1={startX}
                x2={startX}
                y1={top}
                y2={height - bottom}
                className={styles.syllableBoundary}
              />

              <line
                x1={endX}
                x2={endX}
                y1={top}
                y2={height - bottom}
                className={styles.syllableBoundary}
              />

              <text
                x={(startX + endX) / 2}
                y={height - 12}
                textAnchor="middle"
                className={styles.syllableLabel}
              >
                {`Sylaba ${contour.syllableIndex + 1}`}
              </text>

              {contour.points.length > 1 && (
                <polyline
                  points={contour.points
                    .map(
                      (point) =>
                        `${x(point.timeSeconds)},${y(point.semitonesFromReference)}`,
                    )
                    .join(" ")}
                  className={styles.pitchLine}
                />
              )}

              {contour.points.map((point, index) => (
                <circle
                  key={`${contour.syllableIndex}-${index}`}
                  cx={x(point.timeSeconds)}
                  cy={y(point.semitonesFromReference)}
                  r="3.2"
                  className={styles.pitchPoint}
                >
                  <title>
                    {`${point.frequencyHz.toFixed(1)} Hz · ${point.semitonesFromReference.toFixed(2)} semitones · clarity ${point.clarity.toFixed(2)}`}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}

        <text x={left} y={height - 2} className={styles.axisLabel}>
          0 s
        </text>

        <text
          x={width - right}
          y={height - 2}
          textAnchor="end"
          className={styles.axisLabel}
        >
          {formatSeconds(durationSeconds)}
        </text>
      </svg>

      <div className={styles.chartLegend}>
        <span>
          <i className={styles.legendLine} />
          Kontur F0
        </span>
        <span>
          <i className={styles.legendBoundary} />
          Granice sylab
        </span>
      </div>

      <p className={styles.chartNote}>
        Oś pionowa pokazuje zmianę wysokości tonu względem wspólnej
        częstotliwości referencyjnej, wyrażoną w półtonach.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AlignmentSection({
  analysis,
}: {
  readonly analysis: PronunciationAnalysisResult;
}) {
  const { quality, syllableAlignment, forcedAlignment } = analysis;

  return (
    <section className={styles.panel}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.eyebrow}>ETAP 1</span>
          <h2>Dopasowanie nagrania</h2>
        </div>

        <span
          className={`${styles.status} ${styles[`status_${quality.status}`]}`}
        >
          {getStatusLabel(quality.status)}
        </span>
      </div>

      <div className={styles.metricsGrid}>
        <Metric
          label="Średnia pewność"
          value={formatPercent(quality.averageConfidence)}
        />
        <Metric
          label="Czas nagrania"
          value={formatSeconds(forcedAlignment.durationSeconds)}
        />
        <Metric
          label="Klatki mowy"
          value={`${forcedAlignment.speechFrameCount}`}
        />
        <Metric
          label="Dopasowane klatki"
          value={`${forcedAlignment.alignedFrameCount}`}
        />
      </div>

      <h3 className={styles.subheading}>Granice sylab</h3>

      <div className={styles.syllableTable}>
        {syllableAlignment.syllables.map((syllable) => (
          <div
            className={styles.syllableRow}
            key={syllable.syllableIndex}
          >
            <strong>{syllable.syllableIndex + 1}</strong>
            <span>{formatSeconds(syllable.startSeconds)}</span>
            <span>{formatSeconds(syllable.endSeconds)}</span>
            <span>{formatSeconds(syllable.durationSeconds)}</span>
            <span>{formatPercent(syllable.confidence)}</span>
            <span>{syllable.alignedFrames} klatek</span>
          </div>
        ))}
      </div>

      <div className={styles.tableLegend}>
        <span>Sylaba</span>
        <span>Start</span>
        <span>Koniec</span>
        <span>Czas</span>
        <span>Pewność</span>
        <span>Klatki</span>
      </div>

      {quality.issues.length > 0 && (
        <div className={styles.issues}>
          <h3 className={styles.subheading}>Problemy dopasowania</h3>

          {quality.issues.map((issue, index) => (
            <div className={styles.issue} key={`${issue.code}-${index}`}>
              <CircleAlert size={16} />
              <div>
                <strong>{issue.code}</strong>
                <p>{issue.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ToneSection({
  analysis,
}: {
  readonly analysis: PronunciationAnalysisResult;
}) {
  const toneAnalysis = analysis.toneAnalysis;

  return (
    <section className={styles.panel}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.eyebrow}>ETAP 2</span>
          <h2>Analiza tonów</h2>
        </div>

        <span className={styles.status}>
          {getStatusLabel(toneAnalysis.status)}
        </span>
      </div>

      {toneAnalysis.status === "skipped" && (
        <div className={styles.notice}>
          <CircleAlert size={18} />
          <p>
            Analiza tonów została pominięta:{" "}
            {getStatusLabel(toneAnalysis.reason)}. Najpierw musi zostać
            zaakceptowane dopasowanie nagrania.
          </p>
        </div>
      )}

      {toneAnalysis.status === "failed" && (
        <div className={styles.errorBox}>
          Analiza tonów nie powiodła się: {toneAnalysis.message}
        </div>
      )}

      {toneAnalysis.status === "completed" && (
        <>
          <PitchChart
            contours={toneAnalysis.pitchAnalysis.syllables}
            durationSeconds={analysis.forcedAlignment.durationSeconds}
          />

          <div className={styles.toneList}>
            {analysis.syllableRealizations.map((realization, index) => {
              const contour = toneAnalysis.pitchAnalysis.syllables.find(
                (item) => item.syllableIndex === index,
              );

              const assessment =
                toneAnalysis.syllableAssessments[index];

              return (
                <article className={styles.toneCard} key={index}>
                  <div className={styles.toneCardHeader}>
                    <div>
                      <strong>{realization.syllable.pinyin}</strong>
                      <span>
                        Ton leksykalny {realization.syllable.lexicalTone}
                        {" → "}
                        powierzchniowy {realization.surfaceTone}
                      </span>
                    </div>

                    <span
                      className={`${styles.status} ${styles[`status_${assessment?.status ?? "uncertain"}`]}`}
                    >
                      {getStatusLabel(assessment?.status ?? "uncertain")}
                    </span>
                  </div>

                  <p className={styles.toneDescription}>
                    {getToneName(realization.surfaceTone)}
                  </p>

                  {realization.appliedRules.length > 0 && (
                    <p className={styles.sandhi}>
                      Reguły sandhi: {realization.appliedRules.join(", ")}
                    </p>
                  )}

                  <div className={styles.toneMetrics}>
                    <span>
                      Wynik:{" "}
                      <strong>
                        {assessment?.score === null ||
                        assessment?.score === undefined
                          ? "—"
                          : `${assessment.score.toFixed(1)}/100`}
                      </strong>
                    </span>

                    <span>
                      Pewność:{" "}
                      <strong>
                        {formatPercent(assessment?.confidence ?? 0)}
                      </strong>
                    </span>

                    <span>
                      F0:{" "}
                      <strong>
                        {contour?.medianFrequencyHz
                          ? `${contour.medianFrequencyHz.toFixed(1)} Hz`
                          : "—"}
                      </strong>
                    </span>
                  </div>

                  <p className={styles.feedbackCode}>
                    {assessment?.feedbackCode ?? "NO_ASSESSMENT"}
                  </p>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function PronunciationDiagnostics({
  analysis,
}: {
  readonly analysis: PronunciationAnalysisResult;
}) {
  const [expanded, setExpanded] = useState(false);

  const json = useMemo(
    () => JSON.stringify(analysis, null, 2),
    [analysis],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      // Clipboard access may be unavailable outside a secure context.
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.eyebrow}>DIAGNOSTYKA</span>
          <h2>Pełny wynik JSON</h2>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => void handleCopy()}
          >
            <Clipboard size={15} />
            Kopiuj JSON
          </button>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Zwiń" : "Rozwiń"}
          </button>
        </div>
      </div>

      {expanded && <pre className={styles.json}>{json}</pre>}
    </section>
  );
}

export function PronunciationLabPage() {
  const recorder = usePronunciationRecorder();

  const [word, setWord] = useState(INITIAL_WORD);
  const [pinyin, setPinyin] = useState(INITIAL_PINYIN);

  const [uploadedRecording, setUploadedRecording] =
    useState<Blob | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] =
    useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const [response, setResponse] =
    useState<PronunciationAnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const recording = uploadedRecording ?? recorder.recording;
  const audioUrl = uploadedAudioUrl ?? recorder.audioUrl;

  useEffect(() => {
    return () => {
      if (uploadedAudioUrl) {
        URL.revokeObjectURL(uploadedAudioUrl);
      }
    };
  }, [uploadedAudioUrl]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    recorder.clearRecording();

    setUploadedRecording(file);
    setUploadedAudioUrl(URL.createObjectURL(file));
    setFileName(file.name);
    setResponse(null);
    setAnalysisError(null);

    event.target.value = "";
  };

  const handleStartRecording = async () => {
    if (uploadedAudioUrl) {
      URL.revokeObjectURL(uploadedAudioUrl);
    }

    setUploadedRecording(null);
    setUploadedAudioUrl(null);
    setFileName(null);
    setResponse(null);
    setAnalysisError(null);

    await recorder.startRecording();
  };

  const handleAnalyze = async () => {
    if (!recording) {
      setAnalysisError("Najpierw nagraj lub wczytaj plik audio.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setResponse(null);

    try {
      const result = await analyzeWordPronunciation(
        word,
        pinyin,
        recording,
      );

      setResponse(result);

      if (!result.success) {
        setAnalysisError(getErrorMessage(result));
      }
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Wystąpił nieoczekiwany błąd analizy.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    recorder.clearRecording();

    if (uploadedAudioUrl) {
      URL.revokeObjectURL(uploadedAudioUrl);
    }

    setUploadedRecording(null);
    setUploadedAudioUrl(null);
    setFileName(null);
    setResponse(null);
    setAnalysisError(null);
  };

  const successfulAnalysis =
    response?.success === true ? response.analysis : null;

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>
            DEVELOPER TOOL · PRONUNCIATION
          </span>
          <h1>Pronunciation Lab</h1>
          <p>
            Testowanie dopasowania fonemów, granic sylab i analizy
            tonów w rzeczywistych nagraniach.
          </p>
        </div>

        <div className={styles.labBadge}>
          <Activity size={18} />
          <span>Experimental</span>
        </div>
      </header>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <div>
            <span className={styles.eyebrow}>WEJŚCIE</span>
            <h2>Konfiguracja testu</h2>
          </div>
        </div>

        <div className={styles.inputGrid}>
          <label className={styles.field}>
            <span>Słowo / wyrażenie</span>
            <input
              value={word}
              onChange={(event) => setWord(event.target.value)}
              placeholder="你好"
              spellCheck={false}
            />
          </label>

          <label className={styles.field}>
            <span>Pinyin z numerami tonów</span>
            <input
              value={pinyin}
              onChange={(event) => setPinyin(event.target.value)}
              placeholder="ni3 hao3"
              spellCheck={false}
            />
          </label>
        </div>

        <p className={styles.fieldHint}>
          Wprowadź Pinyin w formacie liczbowym, np. ni3 hao3.
          Analizator sam wyznaczy tony powierzchniowe na podstawie
          reguł sandhi.
        </p>

        <div className={styles.recordingArea}>
          <div className={styles.recordingActions}>
            {!recorder.isRecording ? (
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void handleStartRecording()}
                disabled={isAnalyzing}
              >
                <Mic size={17} />
                Nagraj wymowę
              </button>
            ) : (
              <button
                type="button"
                className={styles.dangerButton}
                onClick={recorder.stopRecording}
              >
                <MicOff size={17} />
                Zakończ nagrywanie
              </button>
            )}

            <label
              className={`${styles.secondaryButton} ${isAnalyzing || recorder.isRecording ? styles.disabledButton : ""}`}
            >
              <Upload size={16} />
              Wczytaj audio
              <input
                type="file"
                accept="audio/*,.wav,.mp3,.webm,.m4a,.ogg"
                onChange={handleFileChange}
                disabled={isAnalyzing || recorder.isRecording}
                hidden
              />
            </label>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleClear}
              disabled={!recording && !response}
            >
              <RotateCcw size={15} />
              Wyczyść
            </button>
          </div>

          {recorder.isRecording && (
            <div className={styles.recordingIndicator}>
              <span className={styles.recordingDot} />
              Nagrywanie w toku…
            </div>
          )}

          {recorder.error && (
            <div className={styles.errorBox}>{recorder.error}</div>
          )}

          {recording && audioUrl && (
            <div className={styles.audioPreview}>
              <div className={styles.audioInfo}>
                <FileAudio size={18} />
                <div>
                  <strong>{fileName ?? "Nagranie z mikrofonu"}</strong>
                  <span>{(recording.size / 1024).toFixed(1)} KB</span>
                </div>
              </div>

              <audio controls src={audioUrl} />
            </div>
          )}
        </div>

        <div className={styles.analyzeActions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void handleAnalyze()}
            disabled={
              !recording ||
              isAnalyzing ||
              !word.trim() ||
              !pinyin.trim() ||
              recorder.isRecording
            }
          >
            {isAnalyzing ? (
              <LoaderCircle className={styles.spinner} size={17} />
            ) : (
              <AudioLines size={17} />
            )}

            {isAnalyzing ? "Analizowanie…" : "Uruchom analizę"}
          </button>

          {recording && (
            <span className={styles.readyLabel}>
              <CheckCircle2 size={15} />
              Audio gotowe do analizy
            </span>
          )}
        </div>

        {analysisError && (
          <div className={styles.errorBox}>
            <CircleAlert size={17} />
            {analysisError}
          </div>
        )}
      </section>

      {successfulAnalysis && (
        <>
          <section className={styles.panel}>
            <div className={styles.sectionHeader}>
              <div>
                <span className={styles.eyebrow}>PODSUMOWANIE</span>
                <h2>
                  {successfulAnalysis.word} · {successfulAnalysis.pinyin}
                </h2>
              </div>
            </div>

            <div className={styles.realizationList}>
              {successfulAnalysis.syllableRealizations.map(
                (realization, index) => (
                  <div className={styles.realization} key={index}>
                    <strong>{realization.syllable.pinyin}</strong>
                    <span>
                      {realization.syllable.lexicalTone}
                      {" → "}
                      {realization.surfaceTone}
                    </span>
                    <small>
                      {realization.appliedRules.length > 0
                        ? realization.appliedRules.join(", ")
                        : "Bez sandhi"}
                    </small>
                  </div>
                ),
              )}
            </div>

            <div className={styles.phoneSequence}>
              <span>Fonemy przekazane do Charsiu</span>
              <code>
                {successfulAnalysis.phonemizedPronunciation.phonemes
                  .map((phoneme) => phoneme.symbol)
                  .join(" · ")}
              </code>
            </div>
          </section>

          <AlignmentSection analysis={successfulAnalysis} />
          <ToneSection analysis={successfulAnalysis} />
          <PronunciationDiagnostics analysis={successfulAnalysis} />
        </>
      )}

      {isAnalyzing && (
        <div className={styles.loadingPanel}>
          <LoaderCircle className={styles.spinner} size={26} />
          <strong>Analizuję nagranie…</strong>
          <span>
            Pierwsze uruchomienie może potrwać dłużej ze względu na
            pobieranie modelu Charsiu.
          </span>
        </div>
      )}
    </main>
  );
}
