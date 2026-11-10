import { useCallback, useEffect, useRef, useState } from "react";

interface UsePronunciationRecorderReturn {
  readonly isRecording: boolean;
  readonly recording: Blob | null;
  readonly audioUrl: string | null;
  readonly error: string | null;
  readonly startRecording: () => Promise<void>;
  readonly stopRecording: () => void;
  readonly clearRecording: () => void;
}

function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }

  const mimeTypes = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ];

  return mimeTypes.find((mimeType) =>
    MediaRecorder.isTypeSupported(mimeType),
  );
}

export function usePronunciationRecorder(): UsePronunciationRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const clearRecording = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setRecording(null);
    setAudioUrl(null);
    setError(null);
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (recorderRef.current?.state === "recording") {
      return;
    }

    setError(null);
    clearRecording();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Ta przeglądarka nie obsługuje dostępu do mikrofonu.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setError("Ta przeglądarka nie obsługuje nagrywania audio.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      chunksRef.current = [];
      recorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (blob.size > 0) {
          const url = URL.createObjectURL(blob);

          audioUrlRef.current = url;
          setRecording(blob);
          setAudioUrl(url);
        } else {
          setError("Nagranie jest puste. Spróbuj ponownie.");
        }

        setIsRecording(false);
        recorderRef.current = null;
        releaseStream();
      };

      recorder.onerror = () => {
        setError("Wystąpił błąd podczas nagrywania.");
        setIsRecording(false);
        releaseStream();
      };

      recorder.start();
      setIsRecording(true);
    } catch (caughtError) {
      releaseStream();
      recorderRef.current = null;

      if (
        caughtError instanceof DOMException &&
        caughtError.name === "NotAllowedError"
      ) {
        setError("Brak zgody na korzystanie z mikrofonu.");
        return;
      }

      if (
        caughtError instanceof DOMException &&
        caughtError.name === "NotFoundError"
      ) {
        setError("Nie znaleziono mikrofonu.");
        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Nie udało się rozpocząć nagrywania.",
      );
    }
  }, [clearRecording, releaseStream]);

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;

      if (recorder) {
        recorder.onstop = null;
        recorder.onerror = null;
        recorder.ondataavailable = null;

        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }

      releaseStream();

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, [releaseStream]);

  return {
    isRecording,
    recording,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    clearRecording,
  };
}