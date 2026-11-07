import { useCallback, useEffect, useRef, useState } from "react";

interface UseMicrophoneReturn {
  isRecording: boolean;
  audioUrl: string | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearRecording: () => void;
}

function getSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }

  const mimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

  return mimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

export function useMicrophone(): UseMicrophoneReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);

  const clearRecording = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    setAudioUrl(null);
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;

    if (recorder?.state === "recording") {
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
      setError("Microphone access is not supported in this browser.");
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

      if (typeof MediaRecorder === "undefined") {
        throw new Error("Audio recording is not supported in this browser.");
      }

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

        const url = URL.createObjectURL(blob);

        audioUrlRef.current = url;
        setAudioUrl(url);
        setIsRecording(false);

        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
      };

      recorder.onerror = () => {
        setError("An error occurred while recording audio.");
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);
    } catch (caughtError) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;

      if (
        caughtError instanceof DOMException &&
        caughtError.name === "NotAllowedError"
      ) {
        setError("Microphone permission was denied.");
        return;
      }

      if (
        caughtError instanceof DOMException &&
        caughtError.name === "NotFoundError"
      ) {
        setError("No microphone was found.");
        return;
      }

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not start audio recording.",
      );
    }
  }, [clearRecording]);

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;

      if (recorder) {
        recorder.onstop = null;

        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());

      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, []);

  return {
    isRecording,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    clearRecording,
  };
}
