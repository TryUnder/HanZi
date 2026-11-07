import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

interface UsePronunciationOptions {
  audioUrl: string | null;
  text: string;
}

interface UsePronunciationReturn {
  audioRef: RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  error: string | null;
  play: () => Promise<void>;
}

export function usePronunciation({
  audioUrl,
  text,
}: UsePronunciationOptions): UsePronunciationReturn {
  const audioRef = useRef<HTMLAudioElement>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const play = useCallback(async (): Promise<void> => {
    setError(null);

    // Play local audio file
    if (audioUrl) {
      const audio = audioRef.current;

      if (!audio) return;

      if (!audio.paused) {
        audio.pause();
        return;
      }

      try {
        if (audio.ended) {
          audio.currentTime = 0;
        }

        await audio.play();
      } catch {
        setIsPlaying(false);
        setError("Audio playback failed.");
      }

      return;
    }

    // Check browser speech synthesis support
    if (!("speechSynthesis" in window)) {
      setError("Speech synthesis is not supported in this browser.");
      return;
    }

    const speech = window.speechSynthesis;

    // Pause or resume existing speech
    if (utteranceRef.current && speech.speaking) {
      if (speech.paused) {
        speech.resume();
      } else {
        speech.pause();
      }

      return;
    }

    speech.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "zh-CN";
    utterance.rate = 0.8;

    utterance.onstart = () => {
      setIsPlaying(true);
      setError(null);
    };

    utterance.onpause = () => {
      setIsPlaying(false);
    };

    utterance.onresume = () => {
      setIsPlaying(true);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      setIsPlaying(false);
      utteranceRef.current = null;

      if (event.error !== "canceled" && event.error !== "interrupted") {
        setError("Speech playback failed.");
      }
    };

    utteranceRef.current = utterance;
    speech.speak(utterance);
  }, [audioUrl, text]);

  // Handle audio element events
  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    const handleError = () => {
      setIsPlaying(false);
      setError("Could not load the audio file.");
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  // Cleanup when the component unmounts
  useEffect(() => {
    const audio = audioRef.current;

    return () => {
      audio?.pause();

      if (utteranceRef.current && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    audioRef,
    isPlaying,
    error,
    play,
  };
}
